/* preliminary implementation of sysex library for LUMI 
To be used with WebMidi. Note that sysex commands can only be sent if website is https.
Also, you need to use a WebMidi enabled browser such as chromium.
*/

var lumi = {
  input: null,
  output: null,
  octave_start: 48,
  mode: 0,
}

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
    //var current = parseInt(this.num_bits / 7);
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
  this.get = function(/*size = 32*/) {
    while(this.values.length < 8) this.values.push(0);
    return this.values;
  }
}

function send_sysex(values) {
  values = [0x77, 0x30].concat(values).concat([checksum(values)]);
  log('SEND ' + Array.from(values).map((e) => ('0' + e.toString(16)).slice(-2).toUpperCase()).join(' '));
  lumi.output.sendSysex([0x00, 0x21, 0x10], values);
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
  send_sysex(bits.get());
}

function set_brightness(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x40, 7);
  bits.append(0b00100, 5);
  bits.append(value, 7);
  send_sysex(bits.get());
}

function set_channel(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x00, 7);
  bits.append(0b00000, 5);
  bits.append(value, 32);
  send_sysex(bits.get());
}

function set_octave(value) {
  lumi.octave_start = value * 12 + 48;
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x40, 7);
  bits.append(0b00000, 5);
  bits.append(value, 32);
  send_sysex(bits.get());
}

function set_transpose(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x50, 7);
  bits.append(0b00000, 5);
  bits.append(value, 32);
  send_sysex(bits.get());
}

function set_strike_sensitivity(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x20, 7);
  bits.append(0b00001, 5);
  bits.append(value, 7);
  send_sysex(bits.get());
}

function set_sensitivity(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x50, 7);
  bits.append(0b00001, 5);
  bits.append(value, 7);
  send_sysex(bits.get());
}

function set_fixed_velocity(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x70, 7);
  bits.append(0b00001, 5);
  bits.append(value ? 1 : 0, 1);
  send_sysex(bits.get());
}

function set_fixed_velocity_value(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x00, 7);
  bits.append(0b00010, 5);
  bits.append(value, 7);
  send_sysex(bits.get());
}

function set_color_mode(value) {
  var bits = new BitArray();
  bits.append(0x10, 7);
  bits.append(0x40, 7);
  bits.append(0b00010, 5);
  bits.append(parseInt(value) & 3, 2);
  send_sysex(bits.get());
}

function set_scale(name) {
  var scales = {
    'major': [0x10, 0x60, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00], // major
    'minor': [0x10, 0x60, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00], // minor
    'harmonic minor': [0x10, 0x60, 0x42, 0x00, 0x00, 0x00, 0x00, 0x00], // harmonic minor
    'pentatonic neutral': [0x10, 0x60, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00], // pentatonic neutral
    'pentatonic major': [0x10, 0x60, 0x02, 0x01, 0x00, 0x00, 0x00, 0x00], // pentatonic major
    'pentatonic minor': [0x10, 0x60, 0x22, 0x01, 0x00, 0x00, 0x00, 0x00], // pentatonic minor
    'blues': [0x10, 0x60, 0x42, 0x01, 0x00, 0x00, 0x00, 0x00], // blues
    'dorian': [0x10, 0x60, 0x62, 0x01, 0x00, 0x00, 0x00, 0x00], // dorian
    'phrygian': [0x10, 0x60, 0x02, 0x02, 0x00, 0x00, 0x00, 0x00], // phrygian
    'lydian': [0x10, 0x60, 0x22, 0x02, 0x00, 0x00, 0x00, 0x00], // lydian
    'mixolydian': [0x10, 0x60, 0x42, 0x02, 0x00, 0x00, 0x00, 0x00], // mixolydian
    'locrian': [0x10, 0x60, 0x62, 0x02, 0x00, 0x00, 0x00, 0x00], // locrian
    'whole tone': [0x10, 0x60, 0x02, 0x03, 0x00, 0x00, 0x00, 0x00], // whole tone
    'arabic (a)': [0x10, 0x60, 0x22, 0x02, 0x00, 0x00, 0x00, 0x00], // arabic (a)
    'arabic (b)': [0x10, 0x60, 0x42, 0x03, 0x00, 0x00, 0x00, 0x00], // arabic (b)
    'japanese': [0x10, 0x60, 0x62, 0x03, 0x00, 0x00, 0x00, 0x00], // japanese
    'ryukyu': [0x10, 0x60, 0x02, 0x04, 0x00, 0x00, 0x00, 0x00], // ryukyu
    '8-tone spanish': [0x10, 0x60, 0x22, 0x04, 0x00, 0x00, 0x00, 0x00], // 8-tone spanish
    'chromatic': [0x10, 0x60, 0x42, 0x04, 0x00, 0x00, 0x00, 0x00], // chromatic
  };
  name = name.trim().toLowerCase();
  if(name in scales) {
    send_sysex(scales[name]);
  } else {
    log("unknown scale " + name);
  }
}

function set_key(key) {
}

function query_serial() {
  log('SEND 78 3F');
  lumi.output.sendSysex([0x00, 0x21, 0x10], [0x78, 0x3f]);
}

function send_reset() {
  log('SEND 77 00 01 01 00 5D');
  lumi.output.sendSysex([0x00, 0x21, 0x10], [0x77, 0x00, 0x01, 0x01, 0x00, 0x5D]);
}
