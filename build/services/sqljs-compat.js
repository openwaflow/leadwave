'use strict';

const fs = require("fs");
class SqlJsCompatStatement {
  constructor(_0x32c54d, _0x3e460a) {
    this._stmt = _0x32c54d;
    this._parent = _0x3e460a;
    this._rows = null;
    this._index = 0;
    this._current = null;
    this._boundParams = undefined;
  }
  _invoke(_0x868ff2, _0xc86d22) {
    if (_0xc86d22 === undefined || _0xc86d22 === null) {
      return this._stmt[_0x868ff2]();
    }
    if (Array.isArray(_0xc86d22)) {
      return this._stmt[_0x868ff2](..._0xc86d22);
    }
    return this._stmt[_0x868ff2](_0xc86d22);
  }
  _materialize() {
    if (this._stmt.reader) {
      this._rows = this._invoke("all", this._boundParams);
    } else {
      const _0x2f7ec4 = this._invoke("run", this._boundParams);
      this._parent._rowsModified = _0x2f7ec4.changes;
      this._parent._lastInsertRowid = _0x2f7ec4.lastInsertRowid;
      this._rows = [];
    }
    this._index = 0;
  }
  bind(_0x4284c0) {
    this._boundParams = _0x4284c0;
    this._rows = null;
    this._index = 0;
    this._current = null;
    return true;
  }
  step() {
    if (this._rows === null) {
      this._materialize();
    }
    if (this._index < this._rows.length) {
      this._current = this._rows[this._index];
      this._index += 1;
      return true;
    }
    this._current = null;
    return false;
  }
  getAsObject(_0x4801ca) {
    if (_0x4801ca !== undefined && _0x4801ca !== null) {
      this.bind(_0x4801ca);
      this.step();
    }
    if (this._current) {
      return {
        ...this._current
      };
    } else {
      return {};
    }
  }
  get(_0x51f732) {
    if (_0x51f732 !== undefined && _0x51f732 !== null) {
      this.bind(_0x51f732);
    }
    if (this._rows === null) {
      this._materialize();
    }
    if (this._rows.length > 0) {
      this._current = this._rows[0];
      this._index = 1;
      return this._current;
    }
    this._current = null;
    return undefined;
  }
  run(_0x2878c6) {
    const _0x197d40 = this._invoke("run", _0x2878c6);
    this._parent._rowsModified = _0x197d40.changes;
    this._parent._lastInsertRowid = _0x197d40.lastInsertRowid;
    this._rows = null;
    this._index = 0;
    this._current = null;
    return this;
  }
  getColumnNames() {
    try {
      return this._stmt.columns().map(_0x50425e => _0x50425e.name);
    } catch (_0x4c9163) {
      return [];
    }
  }
  reset() {
    this._rows = null;
    this._index = 0;
    this._current = null;
    return true;
  }
  free() {
    this._rows = null;
    this._index = 0;
    this._current = null;
    return true;
  }
}
class SqlJsCompatAdapter {
  constructor(_0x5f3667) {
    if (!_0x5f3667) {
      throw new Error("SqlJsCompatAdapter requires a better-sqlite3 Database instance");
    }
    this.db = _0x5f3667;
    this._rowsModified = 0;
    this._lastInsertRowid = 0;
  }
  exec(_0x13288a) {
    let _0x99a6e3;
    try {
      _0x99a6e3 = this.db.prepare(_0x13288a);
    } catch (_0xdb8cfb) {
      this.db.exec(_0x13288a);
      this._rowsModified = 0;
      return [];
    }
    if (!_0x99a6e3.reader) {
      const _0x3eea51 = _0x99a6e3.run();
      this._rowsModified = _0x3eea51.changes;
      this._lastInsertRowid = _0x3eea51.lastInsertRowid;
      return [];
    }
    const _0x267712 = _0x99a6e3.columns().map(_0x1c4acf => _0x1c4acf.name);
    const _0x17f744 = _0x99a6e3.raw().all();
    if (_0x17f744.length === 0) {
      return [];
    }
    return [{
      columns: _0x267712,
      values: _0x17f744
    }];
  }
  run(_0x21c435, _0x48714c) {
    let _0x5a49b4;
    try {
      _0x5a49b4 = this.db.prepare(_0x21c435);
    } catch (_0xecc1c5) {
      this.db.exec(_0x21c435);
      this._rowsModified = 0;
      this._lastInsertRowid = 0;
      return this;
    }
    let _0x23bffc;
    if (_0x48714c === undefined || _0x48714c === null) {
      _0x23bffc = _0x5a49b4.run();
    } else if (Array.isArray(_0x48714c)) {
      _0x23bffc = _0x5a49b4.run(..._0x48714c);
    } else {
      _0x23bffc = _0x5a49b4.run(_0x48714c);
    }
    this._rowsModified = _0x23bffc.changes;
    this._lastInsertRowid = _0x23bffc.lastInsertRowid;
    return this;
  }
  getRowsModified() {
    return this._rowsModified;
  }
  getLastInsertRowid() {
    return this._lastInsertRowid;
  }
  prepare(_0xfc695c) {
    return new SqlJsCompatStatement(this.db.prepare(_0xfc695c), this);
  }
  export() {
    try {
      this.db.pragma("wal_checkpoint(TRUNCATE)");
    } catch (_0x1e9a7e) {}
    return fs.readFileSync(this.db.name);
  }
  pragma(_0x5e2831, _0x5bca6f) {
    return this.db.pragma(_0x5e2831, _0x5bca6f);
  }
  close() {
    return this.db.close();
  }
}
module.exports = {
  SqlJsCompatAdapter: SqlJsCompatAdapter,
  SqlJsCompatStatement: SqlJsCompatStatement
};