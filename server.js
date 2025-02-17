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

// 🔐 Load SSL Certificates (If Using HTTPS)
let sslOptions = {};
try {
    sslOptions = {
        key: fs.readFileSync("/home/scholark/pdf-gen-credauction/ssl/privkey.pem"),
        cert: fs.readFileSync("/home/scholark/pdf-gen-credauction/ssl/fullchain.pem"),
    };
} catch (error) {
    console.error("⚠️ SSL Certificate Error:", error.message);
}

// 📌 PDF Generation Endpoint
app.post("/generate-pdf", async (req, res) => {
    try {
        console.log("🔄 Generating PDF...");

        // ✅ Dummy Data for Testing
        const property = {
            propertyName: "Luxury Villa",
            auctionStatus: "Open",
            auctionReference: "Bank X vs Borrower Y",
            propertyDescription: "A beautiful villa in downtown with 5 bedrooms and sea-facing view.",
            pressReleaseDate: "01-01-2025",
            auctionTraining: "Yes",
            inspectionDate: "02-01-2025 to 03-01-2025",
            offerSubmissionLastDate: "05-01-2025",
            auctionStartDate: "06-01-2025 : 10:00 AM",
            auctionEndDate: "06-01-2025 : 04:00 PM",
            firstBid: { bidder: "John Doe", value: "$1000", date: "01-01-2025 09:00:00" },
            lastBid: { bidder: "Jane Smith", value: "$2000", date: "06-01-2025 03:50:00" },
            bankLogo: "https://5.imimg.com/data5/RE/SP/EN/SELLER-95153528/hdfc-logo.png",
        };

        // ✅ Generating 50-60 Dummy Bid Data
        const bids = Array.from({ length: 55 }, (_, i) => ({
            bidderName: `Bidder ${i + 1}`,
            bidValue: `$${(1000 + i * 100).toLocaleString()}`,
            rank: `${i + 1}`,
            ipAddress: `192.168.1.${i + 1}`,
            bidDate: `06-01-2025 ${(9 + i % 12)}:${(i % 60).toString().padStart(2, '0')}:00 AM`,
        }));

        // ✅ Injecting Data into HTML Template
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Auction Report</title>
            <style>
                * { font-family: "Montserrat", sans-serif; }
                body { background-color: #f5f5f5; margin: 0; padding: 0; }
                .page { width: 210mm; height: 297mm; margin: auto; background: white; padding: 20px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1); position: relative; }
                table { width: 98%; margin: 0 auto; border-collapse: collapse; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
                th { background-color: #4a4a4a; color: #ffffff; text-align: left; padding: 12px; }
                td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .header { text-align: center; padding: 20px; background: #4a4a4a; color: #ffffff; }
                .footer { text-align: center; padding: 10px; font-size: 12px; color: #666666; background: #f9f9f9; position: absolute; bottom: 0; width: 100%; }
                .logo-container { display: flex; justify-content: space-between; align-items: center; padding: 20px; }
                .logo-container img { max-height: 50px; }
                .confidential-note { font-size: 12px; color: #666; text-align: center; margin: 15px 0; }
                .page-break { page-break-before: always; }
                .secondary-header { text-align: center; padding: 10px; }
                .secondary-header img { max-height: 50px; display: block; margin: 0 auto; }
                .section { margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="logo-container">
                    <img src="https://credsolv.com/assets/images/logo-dark.png" alt="Company Logo">
                    <img src="${property.bankLogo}" alt="Bank Logo">
                </div>
                <table>
                    <tr><td class="header"><h1>Auction Report</h1><p>Property Name - ${property.propertyName}</p></td></tr>
                    <tr><td class="confidential-note">This report is generated from the CredAuction portal. <strong>CredAuction Confidential.</strong></td></tr>
                </table>
                <div class="section">
                    <h3>Auction Details</h3>
                    <table>
                        <tr><td><strong>Bid Auction Status:</strong> ${property.auctionStatus}</td></tr>
                        <tr><td><strong>Auction Reference:</strong> ${property.auctionReference}</td></tr>
                        <tr><td><strong>Property Description:</strong> ${property.propertyDescription}</td></tr>
                        <tr><td><strong>Press Release Date:</strong> ${property.pressReleaseDate}</td></tr>
                        <tr><td><strong>Auction Start Date:</strong> ${property.auctionStartDate}</td></tr>
                        <tr><td><strong>Auction End Date:</strong> ${property.auctionEndDate}</td></tr>
                    </table>
                </div>
                <div class="footer">📌 This is a system-generated report and does not need any signature.</div>
            </div>

            <div class="page-break"></div>
            <div class="page">
                <div class="secondary-header">
                    <img src="https://credsolv.com/assets/images/logo-dark.png" alt="Credsolv Logo">
                </div>
                <table>
                    <tr><th>Bidder Name</th><th>Bid Value</th><th>Rank</th><th>IP Address</th><th>Bid Date & Time</th></tr>
                    ${bids.map(bid => `
                        <tr>
                            <td>${bid.bidderName}</td>
                            <td>${bid.bidValue}</td>
                            <td>${bid.rank}</td>
                            <td>${bid.ipAddress}</td>
                            <td>${bid.bidDate}</td>
                        </tr>
                    `).join('')}
                </table>
                <div class="footer">📌 This is a system-generated report and does not need any signature.</div>
            </div>
        </body>
        </html>`;

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const pdfPath = `/home/scholark/pdf-gen-credauction/pdfs/Auction_Report_${Date.now()}.pdf`;
        await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
        await browser.close();

        res.json({ success: true, pdfUrl: `https://app.hirenmaurya.me/pdfs/${path.basename(pdfPath)}` });

    } catch (error) {
        res.status(500).json({ error: "Failed to generate PDF" });
    }
});

// ✅ Run HTTPS Server
https.createServer(sslOptions, app).listen(1239, () => console.log(`🚀 PDF Generator running on https://app.hirenmaurya.me:1239`));
