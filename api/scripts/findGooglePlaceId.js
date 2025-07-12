const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Import the configured pool from your file
const pool = require("../config/db.config.js");
const readline = require("readline");

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// A helper function for adding a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A helper function to get user input
const getUserInput = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
};

const processDatabaseRecords = async () => {
    const client = await pool.connect();
    console.log("Acquired a client from the pool to start processing.");

    try {
        // Get all records at once instead of streaming
        const result = await client.query(
            "SELECT id, business_name, city, state, street_address, phone_number, website, latitude, longitude FROM service_providers WHERE google_place_id IS NULL ORDER BY id"
        );

        const records = result.rows;
        console.log(`Found ${records.length} records to process.`);

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const processedCount = i + 1;

            console.log(
                `\n=== Processing Record ${processedCount}/${records.length} ===`
            );
            console.log(`Business: ${row.business_name}`);
            console.log(`Location: ${row.city}, ${row.state}`);
            console.log(`Address: ${row.street_address || "No address"}`);
            console.log(`Phone: ${row.phone_number || "No phone"}`);
            console.log(`Website: ${row.website || "No website"}`);
            console.log(
                `Coordinates: ${row.latitude || "No lat"}, ${
                    row.longitude || "No lng"
                }`
            );

            // 1. Call your Google Places API function here
            const placeData = await getPlaceData(
                row.business_name,
                row.city,
                row.state,
                row.street_address,
                row.phone_number,
                row.website
            );

            // 2. Display the results
            if (placeData) {
                console.log(`\n📍 Google Places Results:`);
                console.log(`   Place ID: ${placeData.placeId}`);
                console.log(`   Display Name: ${placeData.displayName}`);
                console.log(
                    `   Address: ${placeData.formattedAddress || "No address"}`
                );
                console.log(`   Phone: ${placeData.phoneNumber || "No phone"}`);
                console.log(`   Website: ${placeData.website || "No website"}`);
                console.log(
                    `   Coordinates: ${placeData.latitude || "No lat"}, ${
                        placeData.longitude || "No lng"
                    }`
                );
                console.log(
                    `   Price Level: ${
                        placeData.priceLevel || "No price level"
                    }`
                );

                // Ask user what they want to do
                const userChoice = await getUserInput(
                    "\nOptions: (y) Update with this result, (n) Skip, (r) Rerun search, (c) Custom search, (q) Quit: "
                );

                if (userChoice.toLowerCase() === "q") {
                    console.log("\nExiting...");
                    break;
                } else if (userChoice.toLowerCase() === "y") {
                    // Update with current result
                    await updateRecord(client, row, placeData);
                } else if (userChoice.toLowerCase() === "r") {
                    // Rerun search with different options
                    const rerunResult = await rerunSearch(row);
                    if (rerunResult) {
                        const rerunChoice = await getUserInput(
                            "\nUpdate with this new result? (y/n): "
                        );
                        if (rerunChoice.toLowerCase() === "y") {
                            await updateRecord(client, row, rerunResult);
                        }
                    }
                } else if (userChoice.toLowerCase() === "c") {
                    // Custom search
                    const customResult = await customSearch(row);
                    if (customResult) {
                        const customChoice = await getUserInput(
                            "\nUpdate with this custom result? (y/n): "
                        );
                        if (customChoice.toLowerCase() === "y") {
                            await updateRecord(client, row, customResult);
                        }
                    }
                } else {
                    console.log(`⏭️  Skipped: ${row.business_name}`);
                }
            } else {
                console.log(
                    `\n❌ No Google Places data found for: ${row.business_name}`
                );
                const userChoice = await getUserInput(
                    "\nOptions: (n) Next record, (r) Rerun search, (c) Custom search, (q) Quit: "
                );

                if (userChoice.toLowerCase() === "q") {
                    console.log("\nExiting...");
                    break;
                } else if (userChoice.toLowerCase() === "r") {
                    // Rerun search with different options
                    const rerunResult = await rerunSearch(row);
                    if (rerunResult) {
                        const rerunChoice = await getUserInput(
                            "\nUpdate with this result? (y/n): "
                        );
                        if (rerunChoice.toLowerCase() === "y") {
                            await updateRecord(client, row, rerunResult);
                        }
                    }
                } else if (userChoice.toLowerCase() === "c") {
                    // Custom search
                    const customResult = await customSearch(row);
                    if (customResult) {
                        const customChoice = await getUserInput(
                            "\nUpdate with this custom result? (y/n): "
                        );
                        if (customChoice.toLowerCase() === "y") {
                            await updateRecord(client, row, customResult);
                        }
                    }
                } else {
                    console.log(`⏭️  Skipped: ${row.business_name}`);
                }
            }

            // Remove this entire section - no more "Press Enter to continue"
            // const continueChoice = await getUserInput(
            //     "\nPress Enter to continue to next record (or q to quit): "
            // );
            //
            // if (continueChoice.toLowerCase() === "q") {
            //     console.log("\nExiting...");
            //     break;
            // }

            // Just continue to the next iteration automatically
        }

        console.log("\n🎉 All records processed. ✅");
    } catch (error) {
        console.error("❌ Error processing records:", error);
    } finally {
        client.release(); // Release the client back to the pool
        pool.end(); // Close all connections in the pool
        rl.close();
    }
};

async function getPlaceData(
    businessName,
    city,
    state,
    address,
    phoneNumber,
    website
) {
    try {
        // Build a comprehensive search query with all available information
        let searchQuery = businessName;

        // Add address if available
        if (address) {
            searchQuery += ` ${address}`;
        }

        // Add city and state
        if (city) {
            searchQuery += ` ${city}`;
        }
        if (state) {
            searchQuery += ` ${state}`;
        }

        // Add phone number if available (can help with accuracy)
        if (phoneNumber) {
            searchQuery += ` ${phoneNumber}`;
        }

        // Add website if available (can help with accuracy)
        if (website) {
            searchQuery += ` ${website}`;
        }

        // Clean up the query - remove extra spaces and normalize
        searchQuery = searchQuery.trim().replace(/\s+/g, " ");

        console.log(`🔍 Searching Google Places for: "${searchQuery}"`);

        const response = await fetch(
            "https://places.googleapis.com/v1/places:searchText",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
                    "X-Goog-FieldMask":
                        "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.location,places.priceLevel",
                },
                body: JSON.stringify({
                    textQuery: searchQuery,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Google Places API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.places && data.places.length > 0) {
            const place = data.places[0];

            // Map price level to price range
            const mapPriceLevel = (priceLevel) => {
                switch (priceLevel) {
                    case "FREE":
                        return "";
                    case "PRICE_LEVEL_INEXPENSIVE":
                        return "$";
                    case "PRICE_LEVEL_MODERATE":
                        return "$$";
                    case "PRICE_LEVEL_EXPENSIVE":
                        return "$$$";
                    case "PRICE_LEVEL_VERY_EXPENSIVE":
                        return "$$$$";
                    default:
                        return null;
                }
            };

            return {
                placeId: place.id,
                displayName: place.displayName?.text || businessName,
                formattedAddress: place.formattedAddress || null,
                phoneNumber: place.internationalPhoneNumber || null,
                website: place.websiteUri || null,
                latitude: place.location?.latitude || null,
                longitude: place.location?.longitude || null,
                priceLevel: mapPriceLevel(place.priceLevel),
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching place data:", error);
        return null;
    }
}

// Helper function to update the database record
async function updateRecord(client, row, placeData) {
    try {
        console.log("🔄 Updating database...");
        const updateResult = await client.query(
            `UPDATE service_providers 
             SET google_place_id = $1, 
                 business_name = $2, 
                 street_address = $3, 
                 phone_number = $4, 
                 website = $5, 
                 latitude = $6, 
                 longitude = $7,
                 price_range = $8,
                 service_scope = $9
             WHERE id = $10`,
            [
                placeData.placeId,
                placeData.displayName,
                // Use Google Places data if available, otherwise keep existing database values
                placeData.formattedAddress || row.street_address,
                placeData.phoneNumber || row.phone_number,
                placeData.website || row.website,
                placeData.latitude || row.latitude,
                placeData.longitude || row.longitude,
                placeData.priceLevel || row.price_range,
                "local", // Always set service_scope to "local"
                row.id,
            ]
        );
        console.log(
            `✅ Updated: ${row.business_name} -> ${placeData.displayName}`
        );
        console.log(`   Rows affected: ${updateResult.rowCount}`);
    } catch (dbError) {
        console.error("❌ Database update failed:", dbError.message);
        console.error("   Full error:", dbError);
    }
}

// Helper function to rerun search with different options
async function rerunSearch(row) {
    const searchType = await getUserInput(
        "\nSearch type: (1) Name and location only, (2) All info: "
    );

    let result;
    if (searchType === "1") {
        // Name and location only
        result = await getPlaceData(
            row.business_name,
            row.city,
            row.state,
            null, // no address
            null, // no phone
            null // no website
        );
    } else if (searchType === "2") {
        // All info
        result = await getPlaceData(
            row.business_name,
            row.city,
            row.state,
            row.street_address,
            row.phone_number,
            row.website
        );
    } else {
        console.log("Invalid option, skipping rerun.");
        return null;
    }

    // Display the results if found
    if (result) {
        console.log(`\n📍 Rerun Search Results:`);
        console.log(`   Place ID: ${result.placeId}`);
        console.log(`   Display Name: ${result.displayName}`);
        console.log(`   Address: ${result.formattedAddress || "No address"}`);
        console.log(`   Phone: ${result.phoneNumber || "No phone"}`);
        console.log(`   Website: ${result.website || "No website"}`);
        console.log(
            `   Coordinates: ${result.latitude || "No lat"}, ${
                result.longitude || "No lng"
            }`
        );
        console.log(`   Price Level: ${result.priceLevel || "No price level"}`);
    } else {
        console.log("❌ No results found in rerun search.");
    }

    return result;
}

// Helper function for custom search
async function customSearch(row) {
    const customQuery = await getUserInput("\nEnter custom search query: ");

    if (!customQuery.trim()) {
        console.log("Empty query, skipping custom search.");
        return null;
    }

    try {
        console.log(`🔍 Custom search for: "${customQuery}"`);

        const response = await fetch(
            "https://places.googleapis.com/v1/places:searchText",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
                    "X-Goog-FieldMask":
                        "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.location,places.priceLevel",
                },
                body: JSON.stringify({
                    textQuery: customQuery,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Google Places API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.places && data.places.length > 0) {
            const place = data.places[0];

            // Map price level to price range
            const mapPriceLevel = (priceLevel) => {
                switch (priceLevel) {
                    case "FREE":
                        return "";
                    case "PRICE_LEVEL_INEXPENSIVE":
                        return "$";
                    case "PRICE_LEVEL_MODERATE":
                        return "$$";
                    case "PRICE_LEVEL_EXPENSIVE":
                        return "$$$";
                    case "PRICE_LEVEL_VERY_EXPENSIVE":
                        return "$$$$";
                    default:
                        return null;
                }
            };

            const result = {
                placeId: place.id,
                displayName: place.displayName?.text || "Unknown",
                formattedAddress: place.formattedAddress || null,
                phoneNumber: place.internationalPhoneNumber || null,
                website: place.websiteUri || null,
                latitude: place.location?.latitude || null,
                longitude: place.location?.longitude || null,
                priceLevel: mapPriceLevel(place.priceLevel),
            };

            console.log(`\n📍 Custom Search Results:`);
            console.log(`   Place ID: ${result.placeId}`);
            console.log(`   Display Name: ${result.displayName}`);
            console.log(
                `   Address: ${result.formattedAddress || "No address"}`
            );
            console.log(`   Phone: ${result.phoneNumber || "No phone"}`);
            console.log(`   Website: ${result.website || "No website"}`);
            console.log(
                `   Coordinates: ${result.latitude || "No lat"}, ${
                    result.longitude || "No lng"
                }`
            );
            console.log(
                `   Price Level: ${result.priceLevel || "No price level"}`
            );

            return result;
        } else {
            console.log("❌ No results found for custom search.");
            return null;
        }
    } catch (error) {
        console.error("Error in custom search:", error);
        return null;
    }
}

// Handle process termination gracefully
process.on("SIGINT", () => {
    console.log("\n⚠️  Received SIGINT, shutting down gracefully...");
    rl.close();
    pool.end();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n⚠️  Received SIGTERM, shutting down gracefully...");
    rl.close();
    pool.end();
    process.exit(0);
});

// Start processing
console.log("🚀 Starting Google Places ID lookup process...");
console.log("This will process one record at a time with user confirmation.\n");
processDatabaseRecords().catch((error) => {
    console.error("❌ Unhandled error:", error);
    rl.close();
    process.exit(1);
});
