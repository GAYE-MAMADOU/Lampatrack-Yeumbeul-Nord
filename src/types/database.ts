export type LampadaireStatus = 'functional' | 'damaged';
export type ReportStatus = 'pending' | 'approved' | 'rejected';
export type AppRole = 'admin' | 'user';

export interface Lampadaire {
  id: string;
  identifier: string;
  latitude: number;
  longitude: number;
  status: LampadaireStatus;
  created_at: string;
  updated_at: string;
}

export interface Signalement {
  id: string;
  lampadaire_id: string;
  user_id: string;
  cause: string;
  description: string | null;
  photo_url: string;
  status: ReportStatus;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  lampadaire?: Lampadaire;
  profile?: Profile;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface LampadaireHistory {
  id: string;
  lampadaire_id: string;
  action: string;
  previous_status: LampadaireStatus | null;
  new_status: LampadaireStatus | null;
  technician_name: string | null;
  intervention_type: string | null;
  performed_by: string | null;
  created_at: string;
  lampadaire?: Lampadaire;
}
