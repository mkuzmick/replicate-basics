#!/usr/bin/env node

const path = require('path');
const Replicate = require('replicate');
const axios = require('axios');
const fs = require('fs');
require("dotenv").config({ path: __dirname + `/.env.cli` });

const yargs = require("yargs").argv;
yargs._.forEach((arg) => {
  // Assign "true" to any un-hyphenated argument
  yargs[arg] = true;
});

// Use the text after the CLI command as the prompt if no --prompt argument is provided
const prompt = yargs.prompt || yargs._[0] || "Default prompt text";

// Initialize Replicate with your API token
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Function to log time difference
function logTimeDifference(startTime, endTime) {
  const timeDiff = (endTime - startTime) / 1000; // Convert from milliseconds to seconds
  console.log(`Time elapsed: ${timeDiff.toFixed(2)} seconds`);
}

// Function to download a file from a given URL using axios
async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading the file:', error.message);
    throw error;
  }
}

// Wrapping the logic in an async function
async function runReplicate() {
  // Log the start time
  const startTime = Date.now();
  console.log(`Start time: ${new Date(startTime).toLocaleTimeString()}`);

  // Check if the ~/Desktop/replicate directory exists, create it if not
  const desktopDir = path.join(require('os').homedir(), 'Desktop', 'replicate');
  if (!fs.existsSync(desktopDir)) {
    fs.mkdirSync(desktopDir, { recursive: true });
    console.log(`Created directory: ${desktopDir}`);
  }

  try {
    const output = await replicate.run(
      "aleksa-codes/flux-ghibsky-illustration:a9f94946fa0377091ac0bcfe61b0d62ad9a85224e4b421b677d4747914b908c0",
      {
        input: {
          model: "dev",
          prompt: prompt, // Use the prompt from the command line arguments or the text after the command
          lora_scale: 1,
          num_outputs: 1,
          aspect_ratio: "9:16",
          output_format: "jpg",
          guidance_scale: 3.5,
          output_quality: 100,
          num_inference_steps: 28,
        },
      }
    );

    console.log('Replicate output:', output);

    // Download the file from the URL in the output
    if (Array.isArray(output) && output.length > 0) {
        const fileUrl = output[0];
        const originalFileName = path.basename(fileUrl); // Extract the original file name from the URL
        const timestamp = new Date().toISOString().replace(/[:.-]/g, ''); // Create a timestamp (YYYYMMDDTHHMMSSmmm)
        const extension = path.extname(originalFileName); // Extract the file extension
        const baseName = path.basename(originalFileName, extension); // Get the file name without extension
        const newFileName = `${baseName}_${timestamp}${extension}`; // Append the timestamp to the file name
        const destination = path.join(desktopDir, newFileName); // Save to ~/Desktop/replicate directory
  
        await downloadFile(fileUrl, destination);
    } else {
      console.error('No valid URL found in the output.');
    }
  } catch (error) {
    console.error('Error running replicate:', error);
  } finally {
    // Log the stop time
    const stopTime = Date.now();
    console.log(`Stop time: ${new Date(stopTime).toLocaleTimeString()}`);

    // Calculate and log the time difference
    logTimeDifference(startTime, stopTime);
  }
}

// Run the async function
runReplicate();
