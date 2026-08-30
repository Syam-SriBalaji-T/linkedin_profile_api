import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const url = process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: url ?? '',
  },
});
