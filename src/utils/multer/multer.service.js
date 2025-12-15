const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypesEXT = /xlsx|xls/;
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    const extname = allowedTypesEXT.test(file.originalname.toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    if (extname) return cb(null, true);
    cb(new Error('فقط فایل Excel مجاز است'));
  }
});

module.exports = upload;