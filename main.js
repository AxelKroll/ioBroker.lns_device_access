"use strict";

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

const {readFileSync, writeFileSync} = require("fs");


class LnsDeviceAccess extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "lns_device_access",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    readDevices( ) {

        const deviceFn = this.config.communication_directory + "/objects/manageddevices.csv";
        const deviceData = readFileSync(deviceFn, "utf-8");
        const deviceInfos = deviceData.split(/\r?\n/ );

        const oldDeviceList = this.config.deviceList;
        let newDeviceList = "";

        let isHeader = true;
        deviceInfos.forEach(sLine => {
            if (isHeader)
                // skip the header line
                isHeader = false;
            else {
                const sParts = sLine.split("|");
                const sId = sParts[0];
                if (sId.length > 0 )
                {
                    const sName = sParts[1];
                    //const sDevice = sParts[2];
                    //const sFB = sParts[3];
                    //const sVar = sParts[4];

                    newDeviceList = newDeviceList + "|" + sId + "|";
                    const sStateName = "(" + sId + ")";
                    this.setObjectNotExistsAsync(sStateName, {
                        type: "state",
                        common: {
                            name: sName,
                            type: "number",
                            role: "level",
                            read: true,
                            write: true,
                        },
                        native: {},
                    });
                    this.subscribeStates(sStateName);
                }
            }
        });

        this.log.info(`oldDeviceList = ${oldDeviceList}, newDeviceList = ${newDeviceList}`);

        const oldIds = oldDeviceList.split("|");
        oldIds.forEach(oldId => {
            if (oldId.length > 0 ){
                const searchId = "|" + oldId + "|";
                if ( newDeviceList.search(searchId) < 0) {
                    this.log.info(`id ${oldId} deleted`);
                }
            }
        });
        this.config.deviceList = newDeviceList;
    }

    pollDevices( )
    {
        const deviceFn = this.config.communication_directory + "/objects/devicevalues.csv";

        const deviceData = readFileSync(deviceFn, {encoding:"utf-8",flag:"r"});
        const deviceValues = deviceData.split(/\r?\n/ );

        deviceValues.forEach(sLine => {
            const sParts = sLine.split("|");
            let sId = sParts[0];
            if (sId.length > 0){
                const sValue = sParts[1];
                sId = "(" + sId + ")";
                this.setState( sId, sValue, true);
            }
        }
        );
    }

    setDeviceValue( id, value)
    {
        const requestFn = this.config.communication_directory + "/requests/" + id + ".req";

        const idParts = id.split("(");
        let sId = idParts[1];
        sId = sId.substr(0,sId.length-1);
        const sRequest = sId + "|" + value;

        writeFileSync(requestFn, sRequest);
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info("config communication directory: " + this.config.communication_directory);

        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */

        this.readDevices( );
        this.pollDevices( );

        this.pollingInterval = setInterval(() => this.pollDevices(),this.config.update_seconds * 1000);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            clearInterval(this.pollingInterval);
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            if (!state.ack) {
                this.setDeviceValue( id, state.val);
            }
        } else {
            // The state was deleted, dont follow anymore
            this.unsubscribeStates(id);
            this.log.info(`state ${id} deleted`);
        }
    }

}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new LnsDeviceAccess(options);
} else {
    // otherwise start the instance directly
    new LnsDeviceAccess();
}