//% weight=100 color=#F70C18 icon="\uf2c7"
namespace AHT20 {
    const ADDR = 0x38;
    const CMD_INIT = [0xBE, 0x08, 0x00];
    const CMD_MEASURE = [0xAC, 0x33, 0x00];
    const CMD_RESET = 0xBA;
    const STATUS_REG = 0x71;
    const CRC_INIT = 0xFF;
    const CRC_POLY = 0x31;

    let initialized = false;

    function init(): void {
        if (initialized) return;
        reset();  // Always reset first [web:1][web:5]
        let buf = pins.createBufferFromArray(CMD_INIT);
        pins.i2cWriteBuffer(ADDR, buf);
        basic.pause(200);  // Wait for calibration [web:1]
        initialized = true;
    }

    function readStatus(): number {
        pins.i2cWriteNumber(ADDR, STATUS_REG, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(ADDR, NumberFormat.UInt8BE);  // Repeated start OK in MakeCode [web:14]
    }

    function crcCheck(buf: Buffer): boolean {
        let check = CRC_INIT;
        for (let i = 1; i <= 6; i++) {  // CRC over bytes 1-6 only [web:15]
            check ^= buf[i];
            for (let x = 0; x < 8; x++) {
                if ((check & 0x80) != 0) {
                    check = ((check << 1) ^ CRC_POLY) & 0xFF;
                } else {
                    check = (check << 1) & 0xFF;
                }
            }
        }
        return check == buf[0];  // Compare to received CRC byte 0 [web:15]
    }

    function convert(buf: Buffer): [number, number, boolean] {
        let rawRH = ((buf[1] << 12) | (buf[2] << 4) | (buf[3] >> 4));  // 20-bit RH [web:5]
        let RH = rawRH * 100 / 1048576;

        let rawT = ((buf[3] & 0x0F) << 16) | (buf[4] << 8) | buf[5];  // 20-bit T [web:5]
        let T = rawT * 200 / 1048576 - 50;

        let ok = crcCheck(buf);
        return [RH, T, ok];
    }

    function readRaw(): [number, number, boolean] {
        init();
        let measureBuf = pins.createBufferFromArray(CMD_MEASURE);
        pins.i2cWriteBuffer(ADDR, measureBuf);
        basic.pause(80);  // Measurement time [web:5]

        // Poll status busy bit (bit 7) [web:5][web:12]
        while ((readStatus() & 0x80) != 0) {
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
        let [rh, t, ok] = readRaw();
        return Math.round(t * 10) / 10;
    }

    /**
     * Read humidity (%)
     */
    //% blockId="aht20_read_humidity" block="AHT20 humidity %"
    export function humidity(): number {
        let [rh, t, ok] = readRaw();
        return Math.round(rh);
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
        initialized = false;  // Force re-init after reset
    }
}
