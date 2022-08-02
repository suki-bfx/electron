// https://ourcodeworld.com/articles/read/365/how-to-create-a-windows-installer-for-an-application-built-with-electron-framework

// https://stackoverflow.com/questions/37322862/check-if-electron-app-is-launched-with-admin-privileges-on-windows
// cd source; 
// electron-packager . --platform=win32 --arch=x64 --win32metadata.requested-execution-level=highestAvailable BorisFxDesktopWebApp
// electron-packager . --platform=win32 --arch=x64 BorisFxDesktopWebApp
// copy to top level; add DLL path
// node ./build.js

// 1. Import Modules
const { MSICreator } = require('electron-wix-msi');
const path = require('path');

// 2. Define input and output directory.
// Important: the directories must be absolute, not relative e.g
// appDirectory: "C:\\Users\sdkca\Desktop\OurCodeWorld-win32-x64", 
const APP_DIR = path.resolve(__dirname, './BorisFxDesktopWebApp-win32-x64');
// outputDirectory: "C:\\Users\sdkca\Desktop\windows_installer", 
const OUT_DIR = path.resolve(__dirname, './installers');


// 3. Instantiate the MSICreator
const msiCreator = new MSICreator({
    appDirectory: APP_DIR,
    outputDirectory: OUT_DIR,

    // Configure metadata
    description: 'This is a demo application',
    exe: 'BorisFxDesktopWebApp',
    name: 'BorisFX Desktop Web App',
    manufacturer: 'BorisFX',
    version: '1.0.0',
    appIconPath : path.resolve(__dirname, './images/icon.ico'),

    // Configure installer User Interface
    ui: {
        enabled: true,
        chooseDirectory: true,
        images: {
            banner: path.resolve(__dirname, './images/banner.png'),
            background: path.resolve(__dirname, './images/background.jpg')
        }
    },
});

// 4. Create a .wxs template file
msiCreator.create().then(function(){

    // Step 5: Compile the template to a .msi file
    msiCreator.compile();
});