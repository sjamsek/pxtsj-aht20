//% weight=100 color=#32a852 icon=""
namespace AHT20Sensor {

    const ADDR = 0x38;
    const CMD_INIT = [0xBE, 0x08, 0x00];
    const CMD_MEASURE = [0xAC, 0x33, 0x00];
    const CMD_RESET = 0xBA;

    const CRC_INIT = 0xFF;
    const CRC_POLY = 0x31;

    let initialized = false;

    function init() {
        if (initialized) return;
        let buf = pins.createBufferFromArray(CMD_INIT);
        pins.i2cWriteBuffer(ADDR, buf);
        basic.pause(10);
        initialized = true;
    }

    function readStatus(): number {
        pins.i2cWriteNumber(ADDR, 0x71, NumberFormat.UInt8BE);
        let s = pins.i2cReadNumber(ADDR, NumberFormat.UInt8BE);
        return s;
    }

    function crcCheck(buf: Buffer): boolean {
        let check = CRC_INIT;
        for (let i = 0; i < 6; i++) {
            check ^= buf[i];
            for (let x = 0; x < 8; x++) {
                if ((check & 0x80) != 0) {
                    check = ((check << 1) ^ CRC_POLY) & 0xFF;
                } else {
                    check = (check << 1) & 0xFF;
                }
            }
        }
        return check == buf[6];
    }

    function convert(buf: Buffer): [number, number, boolean] {
        let rawRH = ((buf[1] << 16) | (buf[2] << 8) | buf[3]) >> 4;
        let RH = rawRH * 100 / 1048576;

        let rawT = ((buf[3] & 0x0F) << 16) | (buf[4] << 8) | buf[5];
        let T = rawT * 200 / 1048576 - 50;

        let ok = crcCheck(buf);

        return [RH, T, ok];
    }

    function readRaw(): [number, number, boolean] {
        init();

        pins.i2cWriteBuffer(ADDR, pins.createBufferFromArray(CMD_MEASURE));
        basic.pause(80);

        while (readStatus() & 0x80) {
            basic.pause(10);
        }

        let buf = pins.i2cReadBuffer(ADDR, 7);
        return convert(buf);
    }

    /**
     * Read temperature (°C)
     */
    //% blockId="aht20_read_temperature" block="AHT20 temperature (°C)"
    export function temperature(): number {
        let m = readRaw();
        return Math.round(m[1] * 10) / 10;
    }

    /**
     * Read humidity (%)
     */
    //% blockId="aht20_read_humidity" block="AHT20 humidity"
    export function humidity(): number {
        let m = readRaw();
        return Math.round(m[0]);
    }

    /**
     * Reset the AHT20 sensor
     */
    //% blockId="aht20_reset" block="AHT20 reset sensor"
    export function reset(): void {
        let b = pins.createBuffer(1);
        b.setNumber(NumberFormat.UInt8BE, 0, CMD_RESET);
        pins.i2cWriteBuffer(ADDR, b);
        basic.pause(20);
    }
}
