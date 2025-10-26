export class XtPacket {
  handler: string;
  code: string;
  args: string[];
  valid: boolean;

  constructor (message: string) {
    this.handler = '';
    this.code = '';
    this.args = [];
    this.valid = false;

    try {
      const args = message.split('%');
      args.shift(); // initial ''
      if (args.shift() !== 'xt') {
        return; // Invalid packet, leave valid as false
      }

      this.handler = args.shift() ?? '';
      this.code = args.shift() ?? '';
      args.shift(); // -1 that always exists
      args.pop(); // ends with % so has an empty string at the end
      this.args = [...args];
      this.valid = true;
    } catch (error) {
      // Silently fail for malformed packets (e.g., HTTP requests)
      this.valid = false;
    }
  }
}
