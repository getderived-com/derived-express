import { seed } from "drizzle-seed";
import { hashPassword } from "../../password-hash";
import { db } from "../db";

// IMPORT NEW SEED


const seedTables = {

    // ADD NEW SEED
}

export const runAllSeeds = async () => {
    try {
        await seed(db, seedTables, {
            count: 1,
            seed: 123,
            version: '1'
          }).refine( (f) => ({
            TB_admin_user: {
                columns: {
                    password: f.valuesFromArray({values: [hashPassword("admin")]}),
                    email: f.valuesFromArray({values: ["admin@admin.com"]})
                }
            }
          }))
        // safely kill server after running seeds 
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    } catch (error) {
        throw error;
    }
};
