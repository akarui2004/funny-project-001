/**
 * @file bootstrap.ts
 * @description Application Ignition & Environment Initialization
 * * ⚠️ CRITICAL ORDER WARNING:
 * This file must be imported at the absolute top of your entry file (e.g., index.ts).
 * Do not place any application imports above it, as they are rely on the environment
 * variables or configurations intialized here.
 */
import 'dotenv/config';
