//% weight=100 color=#32a852 icon="\uf2c9" block="AHT20"
namespace AHT20Sensor {

    const ADDR = 0x38;
    const CMD_INIT = [0xBE, 0x08, 0x00];
    const CMD_MEASURE = [0xAC, 0x33, 0x00];
    const CMD_RESET = 0xBA;
    const CRC_INIT = 0xFF;
    const CRC_POLY = 0x31;

    export class AHT20 {
        private addr: number;
        private isChecksum: boolean;
        private isCalibrated: boolean;

        constructor(addr: number = ADDR) {
            this.addr = addr;
            this.isChecksum = false;
            this.sleep(100);
            this.initialise();
            this.sleep(10);
            this.isCalibrated = (this.readStatus() & 0b00001000) != 0;
        }

        private sleep(ms: number) {
            control.waitMicros(ms * 1000);
        }
        private initialise(): void {
            pins.i2cWriteBuffer(this.addr, pins.createBufferFromArray(CMD_INIT));
        }
        private readStatus(): number {
            let buf = pins.i2cReadBuffer(this.addr, 1);
            return buf[0];
        }

        //% blockId="aht20_is_calibrated" block="sensor is calibrated"
        isCalibratedStatus(): boolean {
            return this.isCalibrated;
        }

        //% blockId="aht20_read_temperature" block="read temperature (°C)"
        temperature(): number {
            let measurements = this.read();
            return Math.round(measurements[1] * 10) / 10;
        }

        //% blockId="aht20_read_humidity" block="read humidity (%)"
        humidity(): number {
            let measurements = this.read();
            return Math.round(measurements[0] + 0.5);
        }

        read(): [number, number, boolean] {
            pins.i2cWriteBuffer(this.addr, pins.createBufferFromArray(CMD_MEASURE));
            this.sleep(80);
            let busy = true;
            while (busy) {
                this.sleep(10);
                busy = (this.readStatus() & 0b10000000) != 0;
            }
            let buf = pins.i2cReadBuffer(this.addr, 7);
            let measurements = this.convert(buf);
            return measurements;
        }

        // Other internal methods omitted for brevity...

        private convert(buf: Buffer): [number, number, boolean] {
            let rawRH = ((buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 4;
            let RH = rawRH * 100 / 0x100000;
            let rawT = ((buf[3] & 0x0F) << 16) | (buf[4] << 8) | buf[5];
            let T = ((rawT * 200) / 0x100000) - 50;
            this.isChecksum = this.compareChecksum(buf);
            return [RH, T, this.isChecksum];
        }

        private compareChecksum(buf: Buffer): boolean {
            let check = CRC_INIT;
            for (let i = 0; i < 6; i++) {
                check ^= buf[i];
                for (let bit = 0; bit < 8; bit++) {
                    if (check & 0x80) {
                        check = ((check << 1) ^ CRC_POLY) & 0xFF;
                    } else {
                        check = (check << 1) & 0xFF;
                    }
                }
            }
            return check == buf[6];
        }
    }

    //% blockId="aht20_create" block="create AHT20 sensor"
    export function createSensor(): AHT20 {
        return new AHT20();
    }
}
