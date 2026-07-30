alter table users
  alter column interface_locale drop not null,
  alter column display_time_zone drop not null;

alter table users
  add constraint users_preferences_all_or_none check (
    (interface_locale is null and display_time_zone is null) or
    (interface_locale is not null and display_time_zone is not null)
  );
