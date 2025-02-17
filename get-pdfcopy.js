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
app.use(bodyParser.urlencoded({ extended: true })); 

const logsDir = "./logs/";
const logFile = `${logsDir}pdf_generation.log`;
const HARDCODED_BANK_LOGO = "https://5.imimg.com/data5/RE/SP/EN/SELLER-95153528/hdfc-logo.png";

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const log = (message) => {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
};

let sslOptions = {};
try {
    sslOptions = {
        key: fs.readFileSync("./ssl/privkey.pem"),
        cert: fs.readFileSync("./ssl/fullchain.pem"),
    };
    log("✅ SSL Certificates Loaded Successfully");
} catch (error) {
    log(`⚠️ SSL Certificate Error: ${error.message}`);
}

const pdfsDir = "./pdfs/";
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
    log("📂 Created PDFs Directory");
}


app.post("/generate-pdf", async (req, res) => {
    try {
        log("🔄 Generating PDF...");
        log(`📌 Received Request Data: ${JSON.stringify(req.body, null, 2)}`);

       
        let htmlTemplate = fs.readFileSync("./templates/auction_report_template.html", "utf8");

        
        const {
            propertyName,
            auctionStatus,
            auctionReference,
            propertyDescription,
            pressReleaseDate,
            auctionTraining,
            inspectionDate,
            offerSubmissionLastDate,
            auctionStartDate,
            auctionEndDate,
            firstBid,
            lastBid,
            bankLogo,
            bids
        } = req.body;

       
        const bidsPerPage = 20;
        let bidPages = "";

        for (let i = 0; i < bids.length; i += bidsPerPage) {
            const bidsSlice = bids.slice(i, i + bidsPerPage).map(bid => `
                <tr>
                    <td>${bid.bidder_name || "N/A"}</td>
                    <td>${bid.bid_value || "N/A"}</td>
                    <td>${bid.rank || "N/A"}</td>
                    <td>${bid.ip_address || "N/A"}</td>
                    <td>${bid.bid_date || "N/A"}</td>
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

        
        htmlTemplate = htmlTemplate
            .replace("{{PROPERTY_NAME}}", propertyName || "N/A")
            .replace("{{AUCTION_STATUS}}", auctionStatus || "N/A")
            .replace("{{AUCTION_REFERENCE}}", auctionReference || "N/A")
            .replace("{{PROPERTY_DESCRIPTION}}", propertyDescription || "N/A")
            .replace("{{PRESS_RELEASE_DATE}}", pressReleaseDate || "N/A")
            .replace("{{AUCTION_TRAINING}}", "Yes")
            .replace("{{INSPECTION_DATE}}", inspectionDate || "N/A")
            .replace("{{OFFER_SUBMISSION_LAST_DATE}}", offerSubmissionLastDate || "N/A")
            .replace("{{AUCTION_START_DATE}}", auctionStartDate || "N/A")
            .replace("{{AUCTION_END_DATE}}", auctionEndDate || "N/A")
            .replace("{{FIRST_BIDDER_NAME}}", firstBid?.bidder || "N/A")
            .replace("{{FIRST_BID_VALUE}}", firstBid?.value || "N/A")
            .replace("{{FIRST_BID_DATE}}", firstBid?.date || "N/A")
            .replace("{{LAST_BIDDER_NAME}}", lastBid?.bidder || "N/A")
            .replace("{{LAST_BID_VALUE}}", lastBid?.value || "N/A")
            .replace("{{LAST_BID_DATE}}", lastBid?.date || "N/A")
            .replace("{{BANK_LOGO}}", HARDCODED_BANK_LOGO || "N/A")
            .replace("{{BID_PAGES}}", bidPages);

       
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });

        const pdfFileName = `Auction_Report_${Date.now()}.pdf`;``
        const pdfPath = `${pdfsDir}${pdfFileName}`;
        await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
        await browser.close();

        log(`✅ PDF Successfully Generated: ${pdfPath}`);

        const pdfUrl = `https://app.hirenmaurya.me:${PORT}/pdfs/${pdfFileName}`;
        res.json({ success: true, pdfUrl });

    } catch (error) {
        log(`❌ PDF Generation Error: ${error.message}`);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
});


app.use("/pdfs", express.static(pdfsDir));

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to the PDF Generation Service!",
        websocket_info: {
            description: "WebSockets provide full-duplex communication channels over a single TCP connection.",
            usage: "WebSockets are commonly used for real-time applications such as live auctions, stock market updates, and chat applications.",
            implementation: "To implement WebSockets, use libraries like Socket.io for Node.js or native WebSocket APIs in browsers.",
            example: {
                client: "const socket = new WebSocket('wss://yourserver.com'); socket.onmessage = (event) => { console.log(event.data); };",
                server: "const WebSocket = require('ws'); const wss = new WebSocket.Server({ port: 8080 }); wss.on('connection', ws => { ws.send('Hello from server!'); });"
            },
            documentation: "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API"
        }
    });
});


app.post("/view-reportold", (req, res) => {
    console.log("🔹 Received Data:", req.body);

    const {
        property_name,
        auction_status,
        auction_reference,
        property_description,
        press_release_date,
        auction_training,
        inspection_date,
        offer_submission_last_date,
        auction_start_date,
        auction_end_date,
        first_bidder,
        last_bidder,
        bank_logo,
        bids_list
    } = req.body;

   
    const bids = bids_list ? JSON.parse(bids_list) : [];

    res.send(`
        <html>
        <head>
            <title>Auction Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
                button {
                    padding: 10px 20px;
                    font-size: 16px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    cursor: pointer;
                    margin-top: 20px;
                }
                button:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <h1>${property_name} - Auction Report</h1>
            <p><strong>Status:</strong> ${auction_status}</p>
            <p><strong>Reference:</strong> ${auction_reference}</p>
            <p><strong>Description:</strong> ${property_description}</p>
            <p><strong>Press Release Date:</strong> ${press_release_date}</p>
            <p><strong>Auction Training:</strong> ${auction_training}</p>
            <p><strong>Inspection Date:</strong> ${inspection_date}</p>
            <p><strong>Offer Submission Last Date:</strong> ${offer_submission_last_date}</p>
            <p><strong>Auction Start:</strong> ${auction_start_date}</p>
            <p><strong>Auction End:</strong> ${auction_end_date}</p>
            <p><strong>First Bidder:</strong> ${first_bidder}</p>
            <p><strong>Last Bidder:</strong> ${last_bidder}</p>
            <img src="${bank_logo}" alt="Bank Logo" width="200"/>
              <button onclick="generatePDF()">Generate PDF</button>
            <h2>Bids List</h2>
            <table>
                <tr><th>Bidder Name</th><th>Bid Value</th><th>Rank</th><th>IP Address</th><th>Bid Date</th></tr>
                ${bids.map(bid => `<tr>
                    <td>${bid.bidder_name || "N/A"}</td>
                    <td>${bid.bid_value || "N/A"}</td>
                    <td>${bid.rank || "N/A"}</td>
                    <td>${bid.ip_address || "N/A"}</td>
                    <td>${bid.bid_date || "N/A"}</td>
                </tr>`).join("")}
            </table>

          

            <script>
                function generatePDF() {
                    fetch('/generate-pdf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            propertyName: ${JSON.stringify(property_name)},
                            auctionStatus: ${JSON.stringify(auction_status)},
                            auctionReference: ${JSON.stringify(auction_reference)},
                            propertyDescription: ${JSON.stringify(property_description)},
                            pressReleaseDate: ${JSON.stringify(press_release_date)},
                            auctionTraining: ${JSON.stringify(auction_training)},
                            inspectionDate: ${JSON.stringify(inspection_date)},
                            offerSubmissionLastDate: ${JSON.stringify(offer_submission_last_date)},
                            auctionStartDate: ${JSON.stringify(auction_start_date)},
                            auctionEndDate: ${JSON.stringify(auction_end_date)},
                            firstBid: { bidder: ${JSON.stringify(first_bidder)} },
                            lastBid: { bidder: ${JSON.stringify(last_bidder)} },
                            bankLogo: ${JSON.stringify(bank_logo)},
                            bids: ${JSON.stringify(bids)}
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            window.open(data.pdfUrl, '_blank');
                        } else {
                            alert("PDF generation failed!");
                        }
                    })
                    .catch(error => console.error("Error generating PDF:", error));
                }
            </script>
        </body>
        </html>
    `);
});


app.post("/view-report", (req, res) => {
    console.log("🔹 Received Data:", req.body);

    const {
        property_name,
        auction_status,
        auction_reference,
        property_description,
        press_release_date,
        auction_training,
        inspection_date,
        offer_submission_last_date,
        auction_start_date,
        auction_end_date,
        first_bidder,
        last_bidder,
        bank_logo,
        bids_list
    } = req.body;

    const bids = bids_list ? JSON.parse(bids_list) : [];

    res.send(`
        <html>
        <head>
            <title>Auction Report</title>
            <style>
                * { font-family: "Arial", sans-serif; box-sizing: border-box; }
                body { background-color: #f4f4f9; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                .container { max-width: 900px; width: 100%; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #333; font-size: 24px; }
                .header p { font-size: 14px; color: #666; }
                .logo { text-align: center; margin: 20px 0; }
                .logo img { max-width: 150px; }
                .details { margin-bottom: 20px; padding: 20px; background: #fafafa; border-left: 5px solid #007bff; border-radius: 5px; }
                .details p { margin: 8px 0; font-size: 16px; color: #444; }
                .details strong { color: #007bff; }
                .table-container { overflow-x: auto; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; border-radius: 5px; overflow: hidden; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #007bff; color: white; }
                tr:hover { background-color: #f1f1f1; }
                .button-container { text-align: center; margin-top: 20px; }
                .button { display: inline-block; padding: 12px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; transition: 0.3s; }
                .button:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${property_name} - Auction Report</h1>
                    <p>A detailed report of the auction proceedings</p>
                </div>
                
                <div class="logo">
                    <img src="${bank_logo}" alt="Bank Logo">
                </div>

                <div class="details">
                    <p><strong>Status:</strong> ${auction_status}</p>
                    <p><strong>Reference:</strong> ${auction_reference}</p>
                    <p><strong>Description:</strong> ${property_description}</p>
                    <p><strong>Press Release Date:</strong> ${press_release_date}</p>
                    <p><strong>Auction Training:</strong> <span style="color:green;font-weight:bold;">Yes</span></p>
                    <p><strong>Inspection Date:</strong> ${inspection_date}</p>
                    <p><strong>Offer Submission Last Date:</strong> ${offer_submission_last_date}</p>
                    <p><strong>Auction Start:</strong> ${auction_start_date}</p>
                    <p><strong>Auction End:</strong> ${auction_end_date}</p>
                    <p><strong>First Bidder:</strong> ${first_bidder}</p>
                    <p><strong>Last Bidder:</strong> ${last_bidder}</p>
                </div>
<div class="button-container">
                    <button class="button" onclick="generatePDF()">Generate PDF</button>
                </div>

                <h2 style="text-align:center; color:#007bff;">Bids List</h2>

                <div class="table-container">
                    <table>
                        <tr><th>Bidder Name</th><th>Bid Value</th><th>Rank</th><th>IP Address</th><th>Bid Date</th></tr>
                        ${bids.map(bid => `<tr>
                            <td>${bid.bidder_name || "N/A"}</td>
                            <td>${bid.bid_value || "N/A"}</td>
                            <td>${bid.rank || "N/A"}</td>
                            <td>${bid.ip_address || "N/A"}</td>
                            <td>${bid.bid_date || "N/A"}</td>
                        </tr>`).join("")}
                    </table>
                </div>

                
                <script>
                    function generatePDF() {
                        fetch('/generate-pdf', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                propertyName: ${JSON.stringify(property_name)},
                                auctionStatus: ${JSON.stringify(auction_status)},
                                auctionReference: ${JSON.stringify(auction_reference)},
                                propertyDescription: ${JSON.stringify(property_description)},
                                pressReleaseDate: ${JSON.stringify(press_release_date)},
                                auctionTraining: "Yes",
                                inspectionDate: ${JSON.stringify(inspection_date)},
                                offerSubmissionLastDate: ${JSON.stringify(offer_submission_last_date)},
                                auctionStartDate: ${JSON.stringify(auction_start_date)},
                                auctionEndDate: ${JSON.stringify(auction_end_date)},
                                firstBid: { bidder: ${JSON.stringify(first_bidder)} },
                                lastBid: { bidder: ${JSON.stringify(last_bidder)} },
                                bankLogo: ${JSON.stringify(bank_logo)},
                                bids: ${JSON.stringify(bids)}
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                window.open(data.pdfUrl, '_blank');
                            } else {
                                alert("PDF generation failed!");
                            }
                        })
                        .catch(error => console.error("Error generating PDF:", error));
                    }
                </script>
            </div>
        </body>
        </html>
    `);
});




const PORT = 1239;
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Running on https://app.hirenmaurya.me:${PORT}`);
});
