export type Role = 
  | 'admin' 
  | 'staff' 
  | 'coach' 
  | 'athlete' 
  | 'referee' 
  | 'table' 
  | 'medical'
  | 'scoreboard'
  | 'bracket_manager'
  | 'checkin'
  | 'results';

export type Permission = 
  | 'event.manage'       // Create/Delete events, change global settings
  | 'event.settings'     // Edit event details (date, points, rules)
  | 'staff.manage'       // Add/Remove staff
  | 'staff.view'         // View staff list
  | 'athlete.create'     // Register athletes
  | 'athlete.update'     // Edit athlete details
  | 'athlete.delete'     // Remove athletes
  | 'athlete.approve'    // Approve/Reject registrations
  | 'bracket.manage'     // Generate/Regenerate brackets
  | 'fight.score'        // Update match results
  | 'checkin.manage'     // Perform check-in/weigh-in
  | 'attendance.manage'  // Mark attendance
  | 'financial.view';    // View payments/revenue (future)

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'event.manage',
    'event.settings',
    'staff.manage',
    'staff.view',
    'athlete.create',
    'athlete.update',
    'athlete.delete',
    'athlete.approve',
    'bracket.manage',
    'fight.score',
    'checkin.manage',
    'attendance.manage',
    'financial.view',
  ],
  // Legacy roles (kept for compatibility)
  staff: [
    'staff.view',
    'athlete.create',
    'athlete.update',
    'athlete.approve',
    'fight.score',
    'checkin.manage',
    'attendance.manage',
  ],
  coach: [
    'athlete.create',
  ],
  athlete: [],
  referee: [
    'fight.score',
  ],
  table: [
    'fight.score',
    'checkin.manage',
  ],
  medical: [
    'athlete.update',
  ],
  
  // New Requested Roles
  scoreboard: [
    'fight.score',
    'staff.view'
  ],
  bracket_manager: [
    'bracket.manage',
    'fight.score',
    'athlete.update', // Often needed to fix bracket issues
    'staff.view'
  ],
  checkin: [
    'checkin.manage',
    'athlete.update', // To update weight
    'athlete.approve',
    'attendance.manage',
    'staff.view'
  ],
  results: [
    'fight.score',
    'bracket.manage', // To view/audit brackets
    'staff.view'
  ]
};