#pragma once


#ifdef ELECTRONTESTDLL_EXPORTS
#define ELECTRONTEST_API __declspec(dllexport)
#else
#define ELECTRONTEST_API __declspec(dllimport)
#endif
#pragma once


extern "C" ELECTRONTEST_API int install(const char *value);
extern "C" ELECTRONTEST_API int uninstall(const char* value);
extern "C" ELECTRONTEST_API int license(const char* product, const char* serial_number);
extern "C" ELECTRONTEST_API int rebuildJson();
