const TrayWindow = require("electron-tray-window");

const { ipcMain, Tray, app, BrowserWindow, session, dialog } = require("electron");
const path = require("path");

// https://www.npmjs.com/package/ws
// https://www.scriptol.com/javascript/ipc-vs-websocket.php
const WebSocket = require("ws")
const wss = new WebSocket.Server( { port: 1040 } )

const request = require('request');

//var sudo = require('sudo-prompt');
//var options = {
//  name: 'Electron',
//  icns: '/Applications/Electron.app/Contents/Resources/Electron.icns', // (optional)
//};
//sudo.exec('echo hello', options,
//  function(error, stdout, stderr) {
//    if (error) app.exit();
//  }
//);


// DLL
// https://www.npmjs.com/package/ffi-napi

var ffi = require('ffi-napi');
var dll = ffi.Library('ElectronTestDLL', {
  'install': [ 'int', [ 'string' ] ],
  'uninstall': [ 'int', [ 'string' ] ],
  'license': [ 'int', [ 'string', 'string' ] ]
});
console.log("DLL loaded")

var fs = require("fs");

read_file = function(path){
     return fs.readFileSync(path, 'utf8');
}

write_file = function(path, output){
    fs.writeFileSync(path, output);
}


var installedJson = `${path.join(__dirname, "resources/install.json")}`

console.log("installedJson is " + installedJson)

app.on("ready", () => {



  var timeout = 2000;
  if (process.platform === "linux") {
    timeout = 3000;
  }
  setTimeout(function () {


    myWindow = new BrowserWindow({ 
                width: 1000, 
                height: 600,
                frame: false, // Remove Menu bar
                webPreferences: {
                    nodeIntegrationInSubFrames: true, // Needed for webview frame
                    webviewTag: true,
                    nodeIntegration: true
                },
    });



    const isElevated = require('native-is-elevated')();  // boolean value
    if(!isElevated) {
      let response = dialog.showMessageBoxSync(myWindow, {
          type: 'error',
          buttons: ['Exit'],
          title: 'Error',
          message: 'Need to run as Administrator'
      });

      app.exit();
      return;
    }


    

    ipcMain.on("uninstall", (event, info) => {
            fs.exists(installedJson, (exists) => {
                var json = []
                if(exists) {
                  json = JSON.parse(read_file(installedJson));
                }

                var products = []
                var path = "";
                for(const p of json) {
                    if(p["download_url"] != info.download_url)
                      products.push(p)
                    else
                      path = p.path;
                }
                json = products
                var contents = JSON.stringify(json, null, 4)
                write_file(installedJson, contents);


                myWindow.webContents.send("uninstall_status", {"download_url" : info.download_url});
                console.log('Start Uninstalling ' + path)
                dll.uninstall.async('\"' + path + '\"', (error, result) => {
                    console.log('Finish Uninstalling ' + path)
                    json = JSON.parse(read_file(installedJson));
                    var contents = JSON.stringify(json, null, 4)
                    myWindow.webContents.send('refresh', contents);
                 });
                
            });
    });



    ipcMain.on("exit", (event, info) => {
      abortDownloads();
      app.exit();
    });

    function buy(info) {
      myWindow.webContents.send('buy', info);
    }

    var ws = null;
    ipcMain.on("serial_number_ready", (event, info) => {
      // Install in local json
      fs.exists(installedJson, (exists) => {
                var json = []
                if(exists) {
                  json = JSON.parse(read_file(installedJson));
                }

                console.log(info.serial_number);
                var found = false;
                for(const p of json) {
                    if(p["product"] == info.product &&
                        p["host"] == info.host &&
                        p["version"] == info.version &&
                        p["platform"] == info.platform) {
                      found = true;
                      p["serial_number"] = info["serial_number"]
                  }
                }
                if(!found) {
                  json.push(info)
                }
                var contents = JSON.stringify(json, null, 4)
                write_file(installedJson, contents);
                console.log('Start Licensing ')
                dll.license.async(JSON.stringify(info), info["serial_number"], (error, result) => {
                    console.log('Finish Licensing ')
                    json = JSON.parse(read_file(installedJson));
                    var contents = JSON.stringify(json, null, 4)
                    myWindow.webContents.send('refresh', contents);
                    if(ws != null)
                      ws.send(info["serial_number"])
                 });
                
            });



      // Invoke install serial number
    });

    wss.on('connection', function (w) {  
            ws = w;
            w.on( 'message' , function (data)  {
                 console.log(data.toString('utf8'))
                 json = JSON.parse(data.toString('utf8'))
                 buy(json);
                 // TODO : Return success / failure
            })  
            w.on('close', function() { 
                 console.log("Closed") 
                 ws = null;
            })    
            w.send("Hello Websocket!")
        });

    function getInstallerFile (info, installerfilename) {
        // Variable to save downloading progress
        var received_bytes = 0;
        var total_bytes = 0;

        var outStream = fs.createWriteStream(installerfilename);
        
        var urlrequest = request.get(info.download_url);


         urlrequest.on('error', function(err) {
                    console.log(err);
                })
                .on('response', function(data) {
                    total_bytes = parseInt(data.headers['content-length']);
                })
                .on('data', function(chunk) {
                    received_bytes += chunk.length;
                    showDownloadingProgress(info, received_bytes, total_bytes);
                })
                .on('end', function() {
                    downloadComplete(info, installerfilename);
                })
                .pipe(outStream);

        return urlrequest
    };

    function showDownloadingProgress(info, received, total) {
        var percentage = ((received) / total).toFixed(2);
        status = {}
        status.percent = percentage;
        myWindow.webContents.send("download_status", {"status" : status, "download_url" : info.download_url});
    }

    var downloadRequests = {}
    var downloadRequestsPaused = {}
    function downloadComplete(info, installerfilename) {
      if(downloadRequests[info.download_url] == undefined || downloadRequests[info.download_url] == null) {
        return;
      }
      downloadRequests[info.download_url] = null;
      downloadRequestsPaused[info.download_url] = false;
      myWindow.webContents.send("download_complete", {"download_url" : info.download_url});
      console.log('Start Installing ' + installerfilename);


      dll.install.async('\"' + installerfilename + '\"', (error, result) => {
      console.log('Finish Installing ' + installerfilename)

      info.path = installerfilename;
      info.serial_number = "";
      fs.exists(installedJson, (exists) => {
          var json = []
          if(exists) {
            json = JSON.parse(read_file(installedJson));
          }

          // Check if exists and 
          var found = false;
          var index = 0;
          for(const p of json) {
              if(p["product"] == info.product &&
                  p["host"] == info.host &&
                  p["version"] == info.version &&
                  p["platform"] == info.platform) {
                found = true;
                info["serial_number"] = p["serial_number"];
                json.splice(index, 1)
                break;
            }
            index += 1;
          }
          json.push(info);


          var contents = JSON.stringify(json, null, 4)
          write_file(installedJson, contents);

          myWindow.webContents.send('refresh', contents);
      });
      })
    }

    
    ipcMain.on("install", (event, info) => {
           // Check if already downloading the stop it
          if(downloadRequests[info.download_url] != undefined || downloadRequests[info.download_url] != null) {
            if(downloadRequestsPaused[info.download_url]) {
              downloadRequests[info.download_url].resume();
              downloadRequestsPaused[info.download_url] = false;
            }
            else {
              myWindow.webContents.send("download_paused", {"download_url" : info.download_url});
              downloadRequests[info.download_url].pause();
              downloadRequestsPaused[info.download_url] = true;
            }
            return;
          }


          console.log('Downloading ' + info.download_url)

          var filePath = __dirname + '/downloads' + info.download_url.substring(info.download_url.lastIndexOf("/"))
          downloadRequests[info.download_url] = getInstallerFile(info, filePath);
          downloadRequestsPaused[info.download_url] = false;

        });

    function abortDownloads() {
         for(var url in downloadRequests) {
            if(downloadRequests[url] != null) {
              downloadRequests[url].abort();
              downloadRequests[url] = null;
            }
          }
          downloadRequests = {}
    }

    ipcMain.on("abortDownloads", (event, info) => {
          console.log('Aborting Downloads')

          abortDownloads();


          json = JSON.parse(read_file(installedJson));
          var contents = JSON.stringify(json, null, 4)
          myWindow.webContents.send('refresh', contents);
        });

    ipcMain.on("show_license", (event, serial_number) => {
      myWindow.webContents.send("show_license", serial_number);
    });

    ipcMain.on("buy", (event, info) => {
      buy(info);
    });


    console.log("Browser Window Created")

    var url = `file://${path.join(__dirname, "resources/index.html")}`
    console.log("Loading URL: " + url)

    myWindow.loadURL(url)
    console.log("loadURL completed")
    var icon = `${path.join(__dirname, "resources/icon.png")}`
    console.log("Tray icon: " + icon)
    tray = new Tray(icon);
    console.log("Tray created")
    TrayWindow.setOptions({
      tray: tray,
      width: 1200,
      height: 600,
      window: myWindow
    });
    console.log("Tray Window Options Setup")

    function refreshFunc() {
      json = JSON.parse(read_file(installedJson));
      var contents = JSON.stringify(json, null, 4)
      myWindow.webContents.send('refresh', contents);
    }

    setInterval(refreshFunc, 1500);

  }, timeout);
});

