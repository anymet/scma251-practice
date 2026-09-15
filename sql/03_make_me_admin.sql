-- Sign in to the website ONCE first (so your profile row exists), then run
-- this with your own e-mail.  After that the "Admin" button appears.
update public.profiles set is_admin = true
where lower(email) = lower('kittisak.cha@mahidol.ac.th');
