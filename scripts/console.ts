import repl from "node:repl";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Start the REPL server
const replServer = repl.start({
  prompt: "NodeJS-TS> ",
  useColors: true,
});

// Inject your tools directly into the REPL context if needed
// Example: replServer.context.myTool = myTool;
