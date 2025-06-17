#define _CRT_SECURE_NO_WARNINGS
#include <objbase.h>
#include <stdio.h>
#include <wchar.h>
#include <wincred.h>
#include <windows.h>
#include <wlanapi.h>

#pragma comment(lib, "wlanapi.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "Credui.lib")

void save_credentials(const wchar_t *username, const wchar_t *password) {
  CREDENTIALW cred = {0};
  cred.Type = CRED_TYPE_DOMAIN_PASSWORD;
  cred.TargetName = L"Microsoft_WiFi_Profile_eduroam";
  cred.CredentialBlobSize = lstrlenW(password) * sizeof(WCHAR);
  cred.CredentialBlob = (LPBYTE)password;
  cred.Persist = CRED_PERSIST_ENTERPRISE;
  cred.UserName = username;

  if (CredWriteW(&cred, 0)) {
    wprintf(L"[+] Credentials saved for %s\n", cred.TargetName);
  } else {
    wprintf(L"[!] Failed to write credentials. Error: %d\n", GetLastError());
  }
}

int inject_username_into_xml(const wchar_t *username) {
  FILE *in = _wfopen(L"eduroam_template.xml", L"r, ccs=UTF-8");
  FILE *out = _wfopen(L"eduroam.xml", L"w, ccs=UTF-8");
  if (!in || !out) {
    wprintf(L"[!] Failed to open XML template or output file.\n");
    return 0;
  }

  wchar_t line[4096];
  while (fgetws(line, sizeof(line) / sizeof(wchar_t), in)) {
    wchar_t *placeholder = wcsstr(line, L"__USERNAME__");
    if (placeholder) {
      *placeholder = L'\0';
      fwprintf(out, L"%s%s%s", line, username,
               placeholder + wcslen(L"__USERNAME__"));
    } else {
      fputws(line, out);
    }
  }

  fclose(in);
  fclose(out);
  return 1;
}

void connect_to_eduroam() {
  HANDLE hClient = NULL;
  DWORD dwMaxClient = 2, dwCurVersion = 0, dwResult;
  GUID interfaceGuid;
  PWLAN_INTERFACE_INFO_LIST pIfList = NULL;

  dwResult = WlanOpenHandle(dwMaxClient, NULL, &dwCurVersion, &hClient);
  if (dwResult != ERROR_SUCCESS) {
    wprintf(L"[!] WlanOpenHandle failed. Error: %u\n", dwResult);
    return;
  }

  dwResult = WlanEnumInterfaces(hClient, NULL, &pIfList);
  if (dwResult != ERROR_SUCCESS || pIfList->dwNumberOfItems == 0) {
    wprintf(L"[!] No wireless interfaces found. Error: %u\n", dwResult);
    WlanCloseHandle(hClient, NULL);
    return;
  }

  interfaceGuid = pIfList->InterfaceInfo[0].InterfaceGuid;

  FILE *file = _wfopen(L"eduroam.xml", L"rb");
  if (!file) {
    wprintf(L"[!] Failed to open eduroam.xml\n");
    return;
  }

  fseek(file, 0, SEEK_END);
  long size = ftell(file);
  rewind(file);

  wchar_t *xml = (wchar_t *)malloc(size + sizeof(wchar_t));
  fread(xml, 1, size, file);
  xml[size / sizeof(wchar_t)] = L'\0';
  fclose(file);

  DWORD reason;
  dwResult = WlanSetProfile(hClient, &interfaceGuid, 0, xml, NULL, TRUE, NULL,
                            &reason);
  if (dwResult != ERROR_SUCCESS) {
    wprintf(L"[!] WlanSetProfile failed. Error: %u\n", dwResult);
  } else {
    wprintf(L"[+] Profile eduroam added successfully.\n");
  }

  WLAN_CONNECTION_PARAMETERS params = {.wlanConnectionMode =
                                           wlan_connection_mode_profile,
                                       .strProfile = L"eduroam",
                                       .pDot11Ssid = NULL,
                                       .pDesiredBssidList = NULL,
                                       .dot11BssType = dot11_BSS_type_any,
                                       .dwFlags = 0};

  dwResult = WlanConnect(hClient, &interfaceGuid, &params, NULL);
  if (dwResult != ERROR_SUCCESS) {
    wprintf(L"[!] WlanConnect failed. Error: %u\n", dwResult);
  } else {
    wprintf(L"[+] Connecting to eduroam...\n");
  }

  if (pIfList) {
    WlanFreeMemory(pIfList);
  }
  WlanCloseHandle(hClient, NULL);
  free(xml);
}

int wmain(int argc, wchar_t *argv[]) {
  if (argc != 3) {
    wprintf(L"Usage: eduroam.exe <username> <password>\n");
    return 1;
  }

  const wchar_t *username = argv[1];
  const wchar_t *password = argv[2];

  save_credentials(username, password);

  if (!inject_username_into_xml(username)) {
    wprintf(L"[!] Could not inject username into XML.\n");
    return 1;
  }

  connect_to_eduroam();
  return 0;
}