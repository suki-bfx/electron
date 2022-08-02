#include "pch.h" // use stdafx.h in Visual Studio 2017 and earlier
#include <utility>
#include <limits.h>
#include <iostream>
#include <string>
#include "Main.h"


int install(const char* value) {
	std::string command = value;
	command += " /VERYSILENT";
	system(command.c_str());
	return 0;
}

// HACK - maybe install should return the way to uninstall 
// and that gets stored in the JSON to avoid redownloading
int uninstall(const char* value) {
	std::string command = value;
	command += " /VERYSILENT";
	system(command.c_str());
	return 0;
}

int rebuildJson() {
	// TODO
	return 0;
}

int license(const char* product, const char* serial_number) {
	// TODO
	return 0;
}