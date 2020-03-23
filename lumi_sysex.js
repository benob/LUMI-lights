/* preliminary implementation of sysex library for LUMI 
To be used with WebMidi. Note that sysex commands can only be sent if website is https.
Also, you need to use a WebMidi enabled browser.
*/

function checksum(values) {
  var sum = values.length;
  for(var i = 0; i < values.length; i++) {
    sum = (sum * 3 + values[i]) & 0xff;
  }
  return sum & 0x7f;
}

function BitArray() {
  this.values = [];
  this.num_bits = 0;
  this.append = function(value, size = 7) {
    var current = parseInt(this.num_bits / 7);
    var used_bits = parseInt(this.num_bits % 7);
    var packed = 0;
    if(used_bits > 0) {
      packed = this.values[this.values.length - 1];
      this.values.pop();
    }
    this.num_bits += size;
    while(size > 0) {
      packed |= (value << used_bits) & 127;
      size -= (7 - used_bits);
      value >>= (7 - used_bits);
      this.values.push(packed);
      packed = 0;
      used_bits = 0;
    }
  }
  this.get = function(size = 32) {
    while(this.values.length < 8) this.values.push(0);
    return this.values;
  }
}

function send_sysex(values) {
  var output = WebMidi.outputs[1];
  values = [0x77, 0x37].concat(values).concat([checksum(values)]);
  log('SEND ' + values.map((e) => e.toString(16)).join(' '));
  output.sendSysex([0x00, 0x21, 0x10], values);
}

function set_color(id, red, green, blue) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x20 + 0x10 * (id & 1), 7);
  bits.append(0b00100, 5);
  bits.append(parseInt(blue) & 0xff, 8);
  bits.append(parseInt(green) & 0xff, 8);
  bits.append(parseInt(red) & 0xff, 8);
  bits.append(0b11111111, 8);
  send_config(bits.get());
}

function set_brightness(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x40, 7);
  bits.append(0b00100, 5);
  bits.append(value, 7);
  send_config(bits.get());
}

function set_channel(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x00, 7);
  bits.append(0b00000, 5);
  bits.append(value, 32);
  send_config(bits.get());
}

function set_octave(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x40, 7);
  bits.append(0b00000, 5);
  bits.append(value, 32);
  send_config(bits.get());
}

function set_transpose(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x50, 7);
  bits.append(0b00000, 5);
  bits.append(value, 32);
  send_config(bits.get());
}

function set_strike_sensitivity(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x20, 7);
  bits.append(0b00001, 5);
  bits.append(value, 7);
  send_config(bits.get());
}

function set_sensitivity(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x50, 7);
  bits.append(0b00001, 5);
  bits.append(value, 7);
  send_config(bits.get());
}

function set_fixed_velocity(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x70, 7);
  bits.append(0b00001, 5);
  bits.append(value ? 1 : 0, 1);
  send_config(bits.get());
}

function set_fixed_velocity_value(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x00, 7);
  bits.append(0b00010, 5);
  bits.append(value, 7);
  send_config(bits.get());
}

function set_color_mode(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x40, 7);
  bits.append(0b00010, 5);
  bits.append(parseInt(value) & 3, 2);
  send_config(bits.get());
}

