import { Readable, Writable, type ReadableOptions, type WritableOptions } from "node:stream";

export class MockReadable extends Readable {
  protected _buffer: unknown[] | null = [];
  public isTTY = false;
  public isRaw = false;
  public setRawMode() {
    this.isRaw = true;
  }

  constructor(config?: { isTTY?: boolean }, opts?: ReadableOptions) {
    super(opts);
    this.isTTY = config?.isTTY ?? false;
  }

  override _read() {
    if (this._buffer === null) {
      this.push(null);
      return;
    }

    for (const val of this._buffer) {
      this.push(val);
    }

    this._buffer = [];
  }

  pushValue(val: unknown): void {
    this._buffer?.push(val);
  }

  close(): void {
    this._buffer = null;
  }
}

export class MockWritable extends Writable {
  public buffer: string[] = [];
  public isTTY = false;
  public columns = 80;
  public rows = 20;

  constructor(
    config?: { columns?: number; rows?: number; isTTY?: boolean },
    opts?: WritableOptions,
  ) {
    super(opts);
    this.isTTY = config?.isTTY ?? false;
    this.columns = config?.columns ?? 80;
    this.rows = config?.rows ?? 20;
  }

  public resize(columns: number, rows: number): void {
    this.columns = columns;
    this.rows = rows;
    this.emit("resize");
  }

  override _write(
    chunk: any,
    _encoding: BufferEncoding,
    callback: (error?: Error | null | undefined) => void,
  ): void {
    this.buffer.push(chunk.toString());
    callback();
  }
}
