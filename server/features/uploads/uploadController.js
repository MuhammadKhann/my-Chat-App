const { Readable } = require('stream');
const cloudinary = require('../../utils/cloudinaryConfig');
const User = require('../../models/User');

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided." });
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "chat_app_avatars",
                transformation: [{ width: 250, height: 250, crop: "fill", gravity: "face" }]
            },
            async (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return res.status(500).json({ error: "Failed to upload image to the cloud." });
                }

                const updatedUser = await User.findByIdAndUpdate(
                    req.user.id,
                    { avatar: result.secure_url },
                    { returnDocument: 'after' }
                ).select("-password");

                res.status(200).json(updatedUser);
            }
        );

        const readableStream = new Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);

    } catch (error) {
        console.error("Avatar Route Error:", error);
        res.status(500).json({ error: "Internal Server Error during avatar upload." });
    }
};

const uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "chat_app_attachments", resource_type: "auto" },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Error:", error);
                    return res.status(500).json({ error: "Cloud Upload Failed" });
                }
                res.status(200).json({
                    fileUrl: result.secure_url,
                    fileName: req.file.originalname,
                    fileType: req.file.mimetype
                });
            }
        );

        const readableStream = new Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

const downloadFile = async (req, res) => {
    try {
        const fileUrl = req.query.url;
        const fileName = req.query.filename || 'document.pdf';

        if (!fileUrl) return res.status(400).send("No file URL provided.");

        const response = await fetch(fileUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        if (!response.ok) {
            console.error(`🚨 CDN Blocked Request: ${response.status} ${response.statusText}`);
            console.error(`🚨 Attempted URL: ${fileUrl}`);
            return res.status(response.status).send(`Failed to fetch from Cloudinary. Status: ${response.status}`);
        }

        const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_\s()]/g, "").trim();

        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');

        Readable.fromWeb(response.body).pipe(res);

    } catch (err) {
        console.error("Proxy Download Error:", err);
        res.status(500).send("Server failed to process the download.");
    }
};

module.exports = {
    uploadAvatar,
    uploadFile,
    downloadFile
};
