-- Loosen email_triage_rules from rigid sender/domain -> always-X switches
-- into optionally-scoped natural-language guidance the triage automation
-- weighs alongside its own judgment. A rule can still be a hard override
-- (action set), pure guidance (action null, guidance set), or both.

alter table email_triage_rules
  alter column match_type drop not null,
  alter column match_value drop not null,
  alter column action drop not null;

alter table email_triage_rules rename column note to guidance;

alter table email_triage_rules
  add constraint email_triage_rules_scope_check
    check (
      (match_type is null and match_value is null)
      or (match_type in ('sender', 'domain') and match_value is not null)
    );

alter table email_triage_rules
  add constraint email_triage_rules_content_check
    check (action is not null or guidance is not null);
