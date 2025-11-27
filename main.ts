//% weight=100 color=#32a852 icon="\uf2c9" block="AHT20"
namespace AHT20 {
    const AHT20_ADDRESS = 0x38

    let initialized = false

    function init() {
        if (initialized) return
        pins.i2cWriteBuffer(AHT20_ADDRESS, Buffer.fromArray([0xBE, 0x08, 0x00]))
        basic.pause(10)
        initialized = true
    }

    function readRawData(): Buffer {
        init()
        pins.i2cWriteNumber(AHT20_ADDRESS, 0xAC, NumberFormat.UInt8BE)
        basic.pause(80)
        return pins.i2cReadBuffer(AHT20_ADDRESS, 6)
    }

    //% block="temperature (°C)"
    export function readTemperature(): number {
        const d = readRawData()
        const rawT = ((d[3] & 0x0F) << 16) | (d[4] << 8) | d[5]
        return (rawT * 200.0 / 1048576.0) - 50
    }

    //% block="humidity (%%)"
    export function readHumidity(): number {
        const d = readRawData()
        const rawH = ((d[1] << 16) | (d[2] << 8) | d[3]) >> 4
        return (rawH * 100.0) / 1048576.0
    }
}
