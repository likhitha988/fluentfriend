export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg: string, code = 'bad_request') => new HttpError(400, code, msg);
export const unauthorized = (msg = 'Please log in to continue.') => new HttpError(401, 'unauthorized', msg);
export const notFound = (msg = 'Not found.') => new HttpError(404, 'not_found', msg);
export const conflict = (msg: string) => new HttpError(409, 'conflict', msg);
