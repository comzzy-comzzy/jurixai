import { getSupabaseServerClient } from "../src/lib/supabase/server.js";

async function main() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("hackathons")
    .select("id, name, created_at, status, treasury_address, prize_pool_usdc")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching hackathons:", error);
    return;
  }

  console.log("Latest Hackathons:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
