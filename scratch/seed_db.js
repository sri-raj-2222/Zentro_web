const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://qmrwrdvjxuydvmcljckv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtcndyZHZqeHV5ZHZtY2xqY2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTk2ODAsImV4cCI6MjA5MTM3NTY4MH0.KaPkd_tSSqINfC-NOv_F-Ecr_9_OoHCe0n4IhlRM3a4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_SUBTYPES = [
  // Car sub-types
  { id: "car-hatchback", serviceName: "car", typeName: "Hatchback", price: 399, isActive: true, imageUrl: "/images/car-hatchback.png" },
  { id: "car-sedan", serviceName: "car", typeName: "Sedan", price: 499, isActive: true, imageUrl: "/images/car-sedan.png" },
  { id: "car-suv", serviceName: "car", typeName: "SUV", price: 599, isActive: true, imageUrl: "/images/car-suv.png" },
  { id: "car-offroader", serviceName: "car", typeName: "Off-roader", price: 699, isActive: true, imageUrl: "/images/car-offroader.png" },

  // Bike sub-types
  { id: "bike-scooty", serviceName: "bike", typeName: "Scooty", price: 199, isActive: true, imageUrl: "/images/bike-scooty.png" },
  { id: "bike-standard", serviceName: "bike", typeName: "Standard Bike", price: 249, isActive: true, imageUrl: "/images/bike-standard.png" },
  { id: "bike-super", serviceName: "bike", typeName: "Super Bike", price: 349, isActive: true, imageUrl: "/images/bike-super.png" },

  // Tank sub-types
  { id: "tank-per-liter", serviceName: "tank", typeName: "Cost Per Liter", price: 0.5, isActive: true },
];

async function seed() {
  const { data: servicesData, error: fetchError } = await supabase.from("services").select("id");
  if (fetchError) {
    console.error("Error fetching services:", fetchError);
    return;
  }
  
  const mainServiceIds = ["car_wash", "bike_wash", "water_tank"];
  const subtypeRows = servicesData.filter((row) => !mainServiceIds.includes(row.id));
  
  if (subtypeRows.length === 0) {
    console.log("No subtypes in DB. Seeding...");
    const payload = DEFAULT_SUBTYPES.map((st) => ({
      id: st.id,
      label: st.typeName,
      description: st.serviceName,
      price: st.price,
      emoji: st.isActive ? "active" : "inactive",
    }));
    const { error: insertError } = await supabase.from("services").insert(payload);
    if (insertError) {
      console.error("Error inserting subtypes:", insertError);
    } else {
      console.log("Seeding completed successfully!");
    }
  } else {
    console.log("Subtypes already exist in DB. No seeding required.");
  }
}

seed();
