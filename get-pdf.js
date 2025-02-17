const express = require("express");
const fs = require("fs");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Ensure PDFs directory exists
const pdfsDir = "/home/scholark/pdf-gen-credauction/pdfs/";
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
}

// Serve PDFs Publicly
app.use("/pdfs", express.static(pdfsDir));

// PDF Generation Endpoint
app.post("/generate-pdf", async (req, res) => {
    try {
        console.log("🔄 Generating PDF...");
        const pdfFileName = `Auction_Report_${Date.now()}.pdf`;
        const pdfPath = `${pdfsDir}${pdfFileName}`;

        // Simulating PDF generation
        fs.writeFileSync(pdfPath, "Dummy PDF Content");

        console.log(`✅ PDF Successfully Generated: ${pdfPath}`);
        res.json({ success: true, pdfUrl: `http://app.hirenmaurya.me/pdfs/${pdfFileName}` });
    } catch (error) {
        console.error("❌ PDF Generation Error:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
});

// Start Server
const PORT = 4000;
app.listen(PORT, "127.0.0.1", () => {
    console.log(`🚀 Running on http://127.0.0.1:${PORT}`);
});
