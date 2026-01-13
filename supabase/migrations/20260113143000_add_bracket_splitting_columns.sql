alter table "public"."sjjp_events" add column "max_athletes_per_bracket" integer default 0;
alter table "public"."sjjp_events" add column "is_bracket_splitting_enabled" boolean default false;
