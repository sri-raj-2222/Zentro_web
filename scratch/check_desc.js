const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://qmrwrdvjxuydvmcljckv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtcndyZHZqeHV5ZHZtY2xqY2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTk2ODAsImV4cCI6MjA5MTM3NTY4MH0.KaPkd_tSSqINfC-NOv_F-Ecr_9_OoHCe0n4IhlRM3a4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from("services").select("id, description");
  console.log("Current descriptions:", data, error);
}

check();
