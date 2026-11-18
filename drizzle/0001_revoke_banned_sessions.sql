CREATE FUNCTION revoke_banned_user_sessions() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  DELETE FROM public.sessions WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER users_revoke_banned_sessions AFTER UPDATE OF banned_at ON users
  FOR EACH ROW WHEN (OLD.banned_at IS NULL AND NEW.banned_at IS NOT NULL)
  EXECUTE FUNCTION revoke_banned_user_sessions();
