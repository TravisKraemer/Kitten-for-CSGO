const Server = require('./server.js').server
const Player = require('./player.js').player
const ipc = require('electron').ipcRenderer
const shell = require('electron').shell
const fs = require('fs')
const path = require('path')
const os = require('os')
const VDF = require('@node-steam/vdf')
const registry = require('winreg')
const dirSep = (os.platform() === 'win32')?'\\':'/'

let settings = {
  port: '8793',
  volume: .5,
  mvp: true
}
let htEntities = {}
let state = {}
let player// = new Player({})
let server// = new Server({})

function doNothing(){
}

function isDirectory(str){
  return fs.lstatSync(str).isDirectory()
}

function getNicePath(filename=null){
  if(filename == null){
    filename = state.audioDir
  }
  return filename + ((filename.endsWith(dirSep))?'':dirSep)
}

function getConfigFilename(){
  return path.join(state.audioDir,'config.json')
}

function scanForKits(){
  if(htEntities.kitSelect){
    htEntities.kitSelect.onchange = doNothing
    while(htEntities.kitSelect.options.length > 0){
      htEntities.kitSelect.options.remove(0)
    }
    fs.readdir(state.audioDir, function(err, files){
      files = files.map(function(name){
        return path.join(state.audioDir, name)
      }).filter(isDirectory)
      files.forEach(function(kitDir) {
        let dir = kitDir.split(dirSep)
        dir = dir[dir.length -1]
        let op = document.createElement('OPTION')
        op.text = dir
        op.value = dir
        htEntities.kitSelect.options.add(op)
      })
      htEntities.kitSelect.onchange = doNothing //TODO: update current kit
    })
  }
}

function saveSettings(){
  try{
    if(state.audioDir){
      localStorage.setItem('audioDir',state.audioDir)
      if(settings){
        fs.writeFile(getConfigFilename(), JSON.stringify(settings), 'utf8', doNothing)
      }
    }
  }
  catch(err){
    console.log(err)
  }
}

function newAudioDir(){
  ipc.send('open-kitten-dir','selected-directory')
}

function tryLoadSettings(){
  if(state.audioDir == null){
    let msg = 'You must select a directory to store everything in. '
    msg += 'This is also where Kitten looks for music kits.'
    ipc.send('dialog', msg, 'Welcome!', 'welcome-message-done')
  }
  else{
    try{
      fs.readFile(getConfigFilename(), 'utf8', function(err, data){
        if(!err){
          settings = JSON.parse(data)
          scanForKits()
        }
        saveSettings()
      })
    }
    catch(e){
      saveSettings()
    }
  }
}

function getHtEntities(){
  htEntities.kitSelect = document.getElementById('kit')
  htEntities.volumeSlider = document.getElementById('volSlider')
  htEntities.mvpToggle = document.getElementById('mvpToggle')
  htEntities.portNum = document.getElementById('portNum')
  htEntities.dirChange = document.getElementById('dirChange')
  htEntities.aveBtn = document.getElementById('saveBtn')
  htEntities.genConfig = document.getElementById('genConfig')
  htEntities.refreshKitsBtn = document.getElementById('refreshKitsBtn')
  htEntities.muteBtn = document.getElementById('muteBtn')
}

function init(){
  console.log('Music Kitten for CS:GO\nVersion [$VERSION$]\nBy Cory Sanin')
  getHtEntities()

  state.audioDir = localStorage.getItem('audioDir')

  tryLoadSettings()
}

window.onload = init

ipc.on('welcome-message-done', newAudioDir)

//executes when the selected directory dialog is completed
ipc.on('selected-directory', function(event, path){
  if(path.length > 0){
    state.audioDir = path[0]
    tryLoadSettings()
  }
  else if(state.audioDir == null){
    let msg = 'A configuration directory must be chosen.'
    ipc.send('dialog', msg, 'Hey!', 'welcome-message-done')
  }
})
