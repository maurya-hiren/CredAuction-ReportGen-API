const fs = require("fs");
const https = require("https");
const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Load SSL Certificates
let sslOptions = {};
try {
    sslOptions = {
        key: fs.readFileSync("/home/scholark/pdf-gen-credauction/ssl/privkey.pem"),
        cert: fs.readFileSync("/home/scholark/pdf-gen-credauction/ssl/fullchain.pem"),
    };
} catch (error) {
    console.error("⚠️ SSL Certificate Error:", error.message);
}

// Ensure PDFs directory exists
const pdfsDir = "/home/scholark/pdf-gen-credauction/pdfs/";
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
}

// PDF Generation Endpoint
app.post("/generate-pdf", async (req, res) => {
    try {
        console.log("🔄 Generating PDF...");

        // Load HTML Template
        let htmlTemplate = fs.readFileSync("./templates/auction_report_template.html", "utf8");

        // Replace General Data
        htmlTemplate = htmlTemplate
            .replace("{{PROPERTY_NAME}}", "Luxury Villa")
            .replace("{{AUCTION_STATUS}}", "Open")
            .replace("{{AUCTION_REFERENCE}}", "Bank X vs Borrower Y")
            .replace("{{PROPERTY_DESCRIPTION}}", "A beautiful villa with 5 bedrooms and a sea-facing view.")
            .replace("{{PRESS_RELEASE_DATE}}", "01-01-2025")
            .replace("{{AUCTION_START_DATE}}", "06-01-2025 : 10:00 AM")
            .replace("{{AUCTION_END_DATE}}", "06-01-2025 : 04:00 PM")
            .replace("{{BANK_LOGO}}", "https://5.imimg.com/data5/RE/SP/EN/SELLER-95153528/hdfc-logo.png");

        // Generate bid data in pages
        const bidsPerPage = 20;
        const totalBids = 55;
        let bidPages = "";

        for (let i = 0; i < totalBids; i += bidsPerPage) {
            const bidsSlice = Array.from({ length: Math.min(bidsPerPage, totalBids - i) }, (_, j) => `
                <tr>
                    <td>Bidder ${i + j + 1}</td>
                    <td>$${(1000 + (i + j) * 100).toLocaleString()}</td>
                    <td>${i + j + 1}</td>
                    <td>192.168.1.${i + j + 1}</td>
                    <td>06-01-2025 ${(9 + (i + j) % 12)}:${((i + j) % 60).toString().padStart(2, '0')}:00 AM</td>
                </tr>
            `).join("");

            bidPages += `
                <div class="page-break"></div>
                <div class="page">
                    <div class="secondary-header">
                        <img src="https://credsolv.com/assets/images/logo-dark.png" alt="Credsolv Logo">
                    </div>
                    <center><h3>All Bids</h3></center>
                    <table>
                        <tr><th>Bidder Name</th><th>Bid Value</th><th>Rank</th><th>IP Address</th><th>Bid Date & Time</th></tr>
                        ${bidsSlice}
                    </table>
                    <div class="footer">Disclaimer: This is a system-generated report; no signature required.</div>
                </div>
            `;
        }

        htmlTemplate = htmlTemplate.replace("{{BID_PAGES}}", bidPages);

        // Generate and Save PDF
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });

        const pdfPath = `${pdfsDir}Auction_Report_${Date.now()}.pdf`;
        await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
        await browser.close();

        res.json({ success: true, pdfUrl: `https://app.hirenmaurya.me/pdfs/${path.basename(pdfPath)}` });

    } catch (error) {
        console.error("❌ PDF Generation Error:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
});

// Serve PDFs Publicly
app.use("/pdfs", express.static(pdfsDir));

// Start Server
const PORT = 1239;
https.createServer(sslOptions, app).listen(PORT, () => console.log(`🚀 Running on https://app.hirenmaurya.me:${PORT}`));
