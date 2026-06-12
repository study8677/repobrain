#!/usr/bin/env node
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const id = process.argv[2];
if (!id) {
  console.error('usage: node scripts/lux-ticket-inspect-messages.mjs <ticket_id>');
  process.exit(2);
}
const prisma = new PrismaClient();
try {
  const r = await prisma.cmpTicket.findUnique({ where: { id }, select: { consoleJson: true } });
  if (!r) {
    console.error('not found');
    process.exit(1);
  }
  const cj = r.consoleJson || {};
  process.stdout.write(JSON.stringify({ messages: cj.messages || [], lux_request_meta: cj.lux_request_meta || null, client_view: cj.client_view || null }, null, 2) + '\n');
} finally {
  await prisma.$disconnect();
}
