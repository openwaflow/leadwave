const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
class DocumentService {
  constructor() {
    this.database = null;
    let _0x2881cb;
    try {
      _0x2881cb = require("electron").app.getPath("userData");
    } catch (_0x19bafd) {
      _0x2881cb = path.join(os.homedir(), ".leadwave");
    }
    this.uploadsDir = path.join(_0x2881cb, "uploads", "documents");
    this.ensureUploadsDirectory();
  }
  async initialize(_0x45565c) {
    this.database = _0x45565c;
  }
  ensureUploadsDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, {
        recursive: true
      });
    }
  }
  async uploadDocument(_0x73c9a7, _0x4c7de4, _0xdc159a) {
    try {
      const _0x39bc26 = path.extname(_0xdc159a).toLowerCase();
      const _0x4a0369 = [".pdf", ".doc", ".docx", ".txt"];
      if (!_0x4a0369.includes(_0x39bc26)) {
        throw new Error("Unsupported file type: " + _0x39bc26 + ". Supported types: " + _0x4a0369.join(", "));
      }
      const _0x813c0e = crypto.createHash("md5").update(_0x4c7de4).digest("hex");
      const _0x28e84c = _0x813c0e + "_" + Date.now() + _0x39bc26;
      const _0x3dff02 = path.join(this.uploadsDir, _0x28e84c);
      fs.writeFileSync(_0x3dff02, _0x4c7de4);
      const _0x36526a = fs.statSync(_0x3dff02);
      const _0x27976d = _0x39bc26.substring(1);
      const _0xbcebc9 = await this.database.query("INSERT INTO ai_documents (\n          chatbot_id, name, original_filename, file_type, file_size, \n          file_path, processing_status, created_at, updated_at\n        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [_0x73c9a7, _0xdc159a, _0xdc159a, _0x27976d, _0x36526a.size, _0x3dff02]);
      const _0x460428 = _0xbcebc9.lastID || _0xbcebc9.insertId;
      this.processDocumentAsync(_0x460428, _0x3dff02, _0x27976d).catch(_0x2b58c9 => {
        console.error("❌ Async document processing failed for ID " + _0x460428 + ":", _0x2b58c9);
      });
      return {
        success: true,
        documentId: _0x460428,
        message: "Document uploaded successfully and is being processed"
      };
    } catch (_0x127bf2) {
      console.error("❌ Error uploading document:", _0x127bf2);
      throw _0x127bf2;
    }
  }
  async processDocumentAsync(_0x338c56, _0x4e06c5, _0x423a49) {
    try {
      await this.database.query("UPDATE ai_documents SET processing_status = \"processing\", updated_at = CURRENT_TIMESTAMP WHERE id = ?", [_0x338c56]);
      let _0x32b540 = "";
      switch (_0x423a49) {
        case "txt":
          _0x32b540 = await this.extractTextFromTxt(_0x4e06c5);
          break;
        case "pdf":
          _0x32b540 = await this.extractTextFromPdf(_0x4e06c5);
          break;
        case "doc":
        case "docx":
          _0x32b540 = await this.extractTextFromDoc(_0x4e06c5);
          break;
        default:
          throw new Error("Unsupported file type: " + _0x423a49);
      }
      if (!_0x32b540 || _0x32b540.trim().length === 0) {
        throw new Error("No text could be extracted from the document");
      }
      const _0x5296c6 = this.splitTextIntoChunks(_0x32b540);
      for (let _0x258e0c = 0; _0x258e0c < _0x5296c6.length; _0x258e0c++) {
        await this.database.query("INSERT INTO ai_document_chunks (document_id, chunk_index, content, word_count, created_at)\n           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)", [_0x338c56, _0x258e0c, _0x5296c6[_0x258e0c], _0x5296c6[_0x258e0c].split(" ").length]);
      }
      await this.database.query("UPDATE ai_documents SET\n         extracted_text = ?, processing_status = \"completed\",\n         chunk_count = ?, updated_at = CURRENT_TIMESTAMP\n         WHERE id = ?", [_0x32b540, _0x5296c6.length, _0x338c56]);
    } catch (_0x3d9500) {
      console.error("❌ Error processing document " + _0x338c56 + ":", _0x3d9500);
      await this.database.query("UPDATE ai_documents SET\n         processing_status = \"failed\", processing_error = ?, updated_at = CURRENT_TIMESTAMP\n         WHERE id = ?", [_0x3d9500.message, _0x338c56]);
    }
  }
  async extractTextFromTxt(_0x44ad61) {
    return fs.readFileSync(_0x44ad61, "utf8");
  }
  async extractTextFromPdf(_0x365975) {
    try {
      const _0x3b1cc2 = require("pdf-parse");
      const _0x1d71f6 = fs.readFileSync(_0x365975);
      const _0xb3136c = await _0x3b1cc2(_0x1d71f6);
      return _0xb3136c.text;
    } catch (_0x49eba8) {
      return "[PDF Document: " + path.basename(_0x365975) + "]\n\nThis PDF document has been uploaded but automatic text extraction is not available. Please ensure the pdf-parse package is installed for automatic PDF processing, or manually provide the document content in the knowledge base.";
    }
  }
  async extractTextFromDoc(_0x45891d) {
    try {
      if (path.extname(_0x45891d).toLowerCase() === ".docx") {
        const _0x2bce0f = require("mammoth");
        const _0xa37df6 = await _0x2bce0f.extractRawText({
          path: _0x45891d
        });
        return _0xa37df6.value;
      } else {
        throw new Error("DOC format requires additional processing libraries");
      }
    } catch (_0x1bb0bb) {
      return "[Document: " + path.basename(_0x45891d) + "]\n\nThis document has been uploaded but automatic text extraction is not available. Please ensure the mammoth package is installed for DOCX processing, or manually provide the document content in the knowledge base.";
    }
  }
  splitTextIntoChunks(_0x2fdb41, _0x5ee58b = 1000) {
    const _0x1e5830 = [];
    const _0x402786 = _0x2fdb41.split(/[.!?]+/).filter(_0x5abef2 => _0x5abef2.trim().length > 0);
    let _0x1a707d = "";
    for (const _0x50e8e4 of _0x402786) {
      const _0x451e58 = _0x50e8e4.trim();
      if (_0x1a707d.length + _0x451e58.length > _0x5ee58b && _0x1a707d.length > 0) {
        _0x1e5830.push(_0x1a707d.trim());
        _0x1a707d = _0x451e58;
      } else {
        _0x1a707d += (_0x1a707d.length > 0 ? ". " : "") + _0x451e58;
      }
    }
    if (_0x1a707d.trim().length > 0) {
      _0x1e5830.push(_0x1a707d.trim());
    }
    if (_0x1e5830.length > 0) {
      return _0x1e5830;
    } else {
      return [_0x2fdb41];
    }
  }
  async getDocuments(_0xf3aeaa) {
    try {
      const _0x376015 = await this.database.query("SELECT id, name, original_filename, file_type, file_size,\n         processing_status, processing_error, chunk_count, is_active,\n         created_at, updated_at\n         FROM ai_documents\n         WHERE chatbot_id = ?\n         ORDER BY created_at DESC", [_0xf3aeaa]);
      if (_0x376015.success) {
        const _0x2e44fb = Array.isArray(_0x376015.data) ? _0x376015.data : [];
        return _0x2e44fb;
      } else {
        console.error("❌ Database query failed:", _0x376015.error);
        return [];
      }
    } catch (_0x3548c8) {
      console.error("❌ Error getting documents:", _0x3548c8);
      return [];
    }
  }
  async deleteDocument(_0x29026e) {
    try {
      const _0x68ee70 = await this.database.query("SELECT file_path FROM ai_documents WHERE id = ?", [_0x29026e]);
      if (!_0x68ee70.success || !_0x68ee70.data || _0x68ee70.data.length === 0) {
        throw new Error("Document not found");
      }
      const _0x5d60d1 = _0x68ee70.data[0];
      if (_0x5d60d1.file_path && fs.existsSync(_0x5d60d1.file_path)) {
        fs.unlinkSync(_0x5d60d1.file_path);
      }
      const _0x10b525 = await this.database.query("DELETE FROM ai_documents WHERE id = ?", [_0x29026e]);
      if (_0x10b525.success) {
        return {
          success: true,
          message: "Document deleted successfully"
        };
      } else {
        throw new Error("Failed to delete document from database");
      }
    } catch (_0x44f0fc) {
      console.error("❌ Error deleting document:", _0x44f0fc);
      throw _0x44f0fc;
    }
  }
  async searchDocuments(_0x54b8fc, _0x288e44, _0x1c7718 = 5) {
    try {
      const _0x3cf397 = await this.database.query("SELECT dc.content, d.name, d.original_filename\n         FROM ai_document_chunks dc\n         JOIN ai_documents d ON dc.document_id = d.id\n         WHERE d.chatbot_id = ? AND d.is_active = 1 AND d.processing_status = 'completed'\n         AND dc.content LIKE ?\n         ORDER BY dc.chunk_index\n         LIMIT ?", [_0x54b8fc, "%" + _0x288e44 + "%", _0x1c7718]);
      if (_0x3cf397.success) {
        if (Array.isArray(_0x3cf397.data)) {
          return _0x3cf397.data;
        } else {
          return [];
        }
      } else {
        console.error("❌ Search query failed:", _0x3cf397.error);
        return [];
      }
    } catch (_0x1c5eb0) {
      console.error("❌ Error searching documents:", _0x1c5eb0);
      return [];
    }
  }
  async chatbotHasDocuments(_0x2bcbd8) {
    try {
      const _0x47c964 = await this.database.query("SELECT COUNT(*) as count FROM ai_documents\n         WHERE chatbot_id = ? AND is_active = 1 AND processing_status = 'completed'", [_0x2bcbd8]);
      const _0x5ed49a = _0x47c964.data && _0x47c964.data.length > 0 ? _0x47c964.data[0].count : 0;
      return _0x5ed49a > 0;
    } catch (_0x76cd67) {
      console.error("Error checking if chatbot has documents:", _0x76cd67);
      return false;
    }
  }
  async getDocumentContext(_0x52c562, _0x57c2d4) {
    try {
      const _0xa6a770 = this.extractSearchTerms(_0x57c2d4);
      let _0x4916a3 = [];
      for (const _0x2c1df9 of _0xa6a770) {
        const _0x1efd9b = await this.searchDocuments(_0x52c562, _0x2c1df9, 3);
        _0x4916a3 = _0x4916a3.concat(_0x1efd9b);
      }
      const _0x4626c7 = _0x4916a3.filter((_0x6c670c, _0x5e5a97, _0x3270d5) => _0x5e5a97 === _0x3270d5.findIndex(_0x2bd8da => _0x2bd8da.content === _0x6c670c.content)).slice(0, 5);
      return _0x4626c7;
    } catch (_0x59c8e0) {
      console.error("❌ Error getting document context:", _0x59c8e0);
      return [];
    }
  }
  extractSearchTerms(_0x1d35f1) {
    const _0x1292ea = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "what", "where", "when", "why", "how", "who", "your", "our", "their"];
    const _0xb474af = {
      office: ["office", "headquarters", "hq", "location", "address", "building"],
      located: ["located", "situated", "based", "address", "location", "headquarters", "hq"],
      address: ["address", "location", "headquarters", "hq", "office", "situated", "based"],
      location: ["location", "address", "headquarters", "hq", "office", "situated", "based"],
      headquarters: ["headquarters", "hq", "office", "location", "address"],
      contact: ["contact", "phone", "email", "address", "reach"],
      company: ["company", "organization", "business", "enterprise", "corporation"],
      products: ["products", "services", "offerings", "solutions"],
      services: ["services", "products", "offerings", "solutions"]
    };
    const _0x5eb47e = _0x1d35f1.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(_0x4a69d7 => _0x4a69d7.length > 2 && !_0x1292ea.includes(_0x4a69d7));
    let _0x1d912d = [..._0x5eb47e];
    _0x5eb47e.forEach(_0x1ebd53 => {
      if (_0xb474af[_0x1ebd53]) {
        _0x1d912d = _0x1d912d.concat(_0xb474af[_0x1ebd53]);
      }
    });
    return [...new Set(_0x1d912d)];
  }
}
module.exports = DocumentService;