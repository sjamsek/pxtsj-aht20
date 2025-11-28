//% weight=100 color=#32a852 icon="\uf2c9" block="AHT20"
namespace AHT20Sensor {

    import { sleep, i2c, display, temperature } from "microbit";

const ADDR = 0x38;
const CMD_INIT = [0xBE, 0x08, 0x00];
const CMD_MEASURE = [0xAC, 0x33, 0x00];
const CMD_RESET = 0xBA;
const CRC_INIT = 0xFF;
const CRC_POLY = 0x31;

class AHT20 {
    addr: number;
    IsChecksum: boolean;
    IsCalibrated: number;

    constructor(addr = ADDR) {
        sleep(100);
        this.addr = addr;
        this.IsChecksum = false;
        this.Initialise();
        sleep(10);
        this.IsCalibrated = this.Read_Status() & 0b00001000;
    }

    Initialise() {
        i2c.write(this.addr, Uint8Array.from(CMD_INIT));
    }

    Read_Status(): number {
        const buf = i2c.read(this.addr, 1);
        return buf[0];
    }

    Is_Calibrated(): boolean {
        return Boolean(this.IsCalibrated);
    }

    Is_Checksum(): boolean {
        return this.IsChecksum;
    }

    Read(): [number, number, boolean] {
        i2c.write(this.addr, Uint8Array.from(CMD_MEASURE));
        sleep(80);
        let busy = true;
        while (busy) {
            sleep(10);
            busy = (this.Read_Status() & 0b10000000) !== 0;
        }
        const buf = i2c.read(this.addr, 7);
        const measurements = this._Convert(buf);
        return measurements;
    }

    T(): number {
        const measurements = this.Read();
        return Math.round(measurements[1] * 10) / 10;
    }

    RH(): number {
        const measurements = this.Read();
        return Math.floor(measurements[0] + 0.5);
    }

    Reset() {
        i2c.write(this.addr, Uint8Array.of(CMD_RESET));
        sleep(20);
    }

    private _Convert(buf: Uint8Array): [number, number, boolean] {
        const RawRH = ((buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 4;
        const RH = RawRH * 100 / 0x100000;
        const RawT = ((buf[3] & 0x0F) << 16) | (buf[4] << 8) | buf[5];
        const T = ((RawT * 200) / 0x100000) - 50;
        this.IsChecksum = this._Compare_Checksum(buf);
        return [RH, T, this.IsChecksum];
    }

    private _Compare_Checksum(buf: Uint8Array): boolean {
        let check = CRC_INIT;
        for (let i = 0; i < 6; i++) {
            check ^= buf[i];
            for (let x = 0; x < 8; x++) {
                if ((check & 0x80) !== 0) {
                    check = ((check << 1) ^ CRC_POLY) & 0xFF;
                } else {
                    check = (check << 1) & 0xFF;
                }
            }
        }
        return check === buf[6];
    }
}

const aht20 = new AHT20();
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
    }
}
