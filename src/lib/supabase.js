import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rxujhahcsmbqwtvyvhub.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWpoYWhjc21icXd0dnl2aHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NTcxNjIsImV4cCI6MjA5OTIzMzE2Mn0.D9XvLP6E6_k1X_o0_7JZ6ceXIFzUnMxXucQVN7vwEWk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
