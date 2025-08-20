import { PrismaClient } from '@prisma/client';

// Extend BigInt prototype for JSON serialization
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Handle BigInt serialization
BigInt.prototype.toJSON = function() { return this.toString(); };

interface TableInfo {
  name: string;
  sql: string;
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface IndexInfo {
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
}

interface IndexColumnInfo {
  seqno: number;
  cid: number;
  name: string;
}

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Get all tables in the database
    const tables = await prisma.$queryRaw<TableInfo[]>`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name;
    `;
    
    console.log('Tables in the database:');
    console.log(JSON.stringify(tables, null, 2));
    
    // Check each table's structure
    for (const table of tables) {
      if (table.name === 'sqlite_sequence') continue;
      
      try {
        // Get table columns
        const columns = await prisma.$queryRawUnsafe<ColumnInfo[]>(
          `PRAGMA table_info(${table.name});`
        );
        
        console.log(`\nTable structure for ${table.name}:`);
        console.log(JSON.stringify(columns, null, 2));
        
        // Get index information for the table
        const indexes = await prisma.$queryRawUnsafe<IndexInfo[]>(
          `PRAGMA index_list(${table.name});`
        );
        
        if (Array.isArray(indexes) && indexes.length > 0) {
          console.log(`\nIndexes for ${table.name}:`);
          for (const index of indexes) {
            const indexInfo = await prisma.$queryRawUnsafe<IndexColumnInfo[]>(
              `PRAGMA index_info(${index.name});`
            );
            console.log(`- ${index.name} (${index.unique ? 'UNIQUE' : 'NON-UNIQUE'}):`);
            console.log(JSON.stringify(indexInfo, null, 2));
          }
        }
      } catch (error) {
        console.error(`Error getting info for table ${table.name}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error checking database schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
