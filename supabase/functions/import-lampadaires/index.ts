import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// UTM Zone 28N to WGS84 conversion
// Using simplified formulas for UTM to Lat/Lon conversion
function utmToLatLon(easting: number, northing: number, zone: number = 28, isNorthernHemisphere: boolean = true): { lat: number; lon: number } {
  const k0 = 0.9996;
  const a = 6378137; // WGS84 semi-major axis
  const e = 0.081819191; // WGS84 eccentricity
  const e1sq = 0.006739497;
  const e2 = e * e;

  const arc = northing / k0;
  const mu = arc / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

  const ei = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const ca = 3 * ei / 2 - 27 * Math.pow(ei, 3) / 32;
  const cb = 21 * Math.pow(ei, 2) / 16 - 55 * Math.pow(ei, 4) / 32;
  const cc = 151 * Math.pow(ei, 3) / 96;
  const cd = 1097 * Math.pow(ei, 4) / 512;

  const phi1 = mu + ca * Math.sin(2 * mu) + cb * Math.sin(4 * mu) + cc * Math.sin(6 * mu) + cd * Math.sin(8 * mu);

  const n0 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
  const r0 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const fact1 = n0 * Math.tan(phi1) / r0;

  const _a1 = 500000 - easting;
  const dd0 = _a1 / (n0 * k0);
  const fact2 = dd0 * dd0 / 2;
  const t0 = Math.tan(phi1) * Math.tan(phi1);
  const Q0 = e1sq * Math.cos(phi1) * Math.cos(phi1);
  const fact3 = (5 + 3 * t0 + 10 * Q0 - 4 * Q0 * Q0 - 9 * e1sq) * Math.pow(dd0, 4) / 24;
  const fact4 = (61 + 90 * t0 + 298 * Q0 + 45 * t0 * t0 - 252 * e1sq - 3 * Q0 * Q0) * Math.pow(dd0, 6) / 720;

  const lof1 = _a1 / (n0 * k0);
  const lof2 = (1 + 2 * t0 + Q0) * Math.pow(dd0, 3) / 6;
  const lof3 = (5 - 2 * Q0 + 28 * t0 - 3 * Q0 * Q0 + 8 * e1sq + 24 * t0 * t0) * Math.pow(dd0, 5) / 120;
  const _a2 = (lof1 - lof2 + lof3) / Math.cos(phi1);
  const _a3 = _a2 * 180 / Math.PI;

  let latitude = 180 * (phi1 - fact1 * (fact2 + fact3 + fact4)) / Math.PI;
  if (!isNorthernHemisphere) {
    latitude = -latitude;
  }

  const zoneCentralMeridian = (zone - 1) * 6 - 180 + 3;
  let longitude = zoneCentralMeridian - _a3;

  return { lat: latitude, lon: longitude };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('User is not admin:', user.id, roleData?.role);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin user authenticated:', user.id);

    const { geojsonData } = await req.json();

    if (!geojsonData || !geojsonData.features) {
      return new Response(
        JSON.stringify({ error: 'Invalid GeoJSON data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${geojsonData.features.length} features...`);

    // Delete existing lampadaires
    const { error: deleteError } = await supabase
      .from('lampadaires')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting existing lampadaires:', deleteError);
    }

    // Use a Map to deduplicate by identifier (keep last occurrence)
    const lampadairesMap = new Map<string, {
      identifier: string;
      latitude: number;
      longitude: number;
      status: 'functional';
    }>();

    let skippedInvalid = 0;
    const duplicateIdentifiers: string[] = [];

    for (let idx = 0; idx < geojsonData.features.length; idx++) {
      const feature = geojsonData.features[idx];
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      // Get identifier from NOM or Point_
      const identifier: string = props.NOM || props.Point_ || `LP-${idx + 1}`;

      let lat: number;
      let lon: number;

      // Check if lat/lon are already provided in properties
      if (props.Latitude_ && props.Longitude_) {
        lat = props.Latitude_;
        lon = props.Longitude_;
      } else {
        // Convert from UTM Zone 28N
        const easting = coords[0];
        const northing = coords[1];
        const converted = utmToLatLon(easting, northing, 28, true);
        lat = converted.lat;
        lon = converted.lon;
      }

      // Validate coordinates
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.warn(`Invalid coordinates for ${identifier}: lat=${lat}, lon=${lon}`);
        skippedInvalid++;
        continue;
      }

      // Track duplicates
      if (lampadairesMap.has(identifier)) {
        if (!duplicateIdentifiers.includes(identifier)) {
          duplicateIdentifiers.push(identifier);
        }
      }

      lampadairesMap.set(identifier, {
        identifier,
        latitude: lat,
        longitude: lon,
        status: 'functional' as const,
      });
    }

    const lampadaires = Array.from(lampadairesMap.values());

    console.log(`Found ${duplicateIdentifiers.length} duplicate identifiers: ${duplicateIdentifiers.slice(0, 10).join(', ')}${duplicateIdentifiers.length > 10 ? '...' : ''}`);
    console.log(`Skipped ${skippedInvalid} entries with invalid coordinates`);
    console.log(`Inserting ${lampadaires.length} unique lampadaires...`);

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < lampadaires.length; i += batchSize) {
      const batch = lampadaires.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('lampadaires')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`Successfully inserted ${insertedCount} lampadaires`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Imported ${insertedCount} lampadaires`,
        total: geojsonData.features.length,
        uniqueCount: lampadaires.length,
        inserted: insertedCount,
        duplicatesCount: duplicateIdentifiers.length,
        duplicateIdentifiers: duplicateIdentifiers,
        skippedInvalid: skippedInvalid,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
