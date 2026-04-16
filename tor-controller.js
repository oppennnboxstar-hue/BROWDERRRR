const net = require('net');

class TorController {
  constructor(host, port, password = '') {
    this.host = host;
    this.port = port;
    this.password = password;
    this.socket = null;
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.port, this.host, () => {
        this.sendCommand('AUTHENTICATE "' + this.password + '"')
          .then(() => resolve())
          .catch(() => resolve());
      });
      
      this.socket.on('error', reject);
      
      let buffer = '';
      this.socket.on('data', (data) => {
        buffer += data.toString();
        
        const lines = buffer.split('\r\n');
        buffer = lines.pop();
        
        lines.forEach(line => {
          if (line) this.handleResponse(line);
        });
      });
    });
  }
  
  handleResponse(line) {
    console.log('Tor Control:', line);
  }
  
  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }
      
      const responseHandler = (data) => {
        const response = data.toString();
        
        if (response.startsWith('250')) {
          this.socket.removeListener('data', responseHandler);
          resolve(response);
        } else if (response.startsWith('5')) {
          this.socket.removeListener('data', responseHandler);
          reject(new Error(response));
        }
      };
      
      this.socket.on('data', responseHandler);
      this.socket.write(command + '\r\n');
      
      setTimeout(() => {
        this.socket.removeListener('data', responseHandler);
        reject(new Error('Command timeout'));
      }, 5000);
    });
  }
  
  async signalNewnym() {
    try {
      await this.connect();
      await this.sendCommand('SIGNAL NEWNYM');
      this.socket.end();
      return true;
    } catch (error) {
      console.error('Failed to send NEWNYM signal:', error);
      return false;
    }
  }
}

module.exports = TorController;
