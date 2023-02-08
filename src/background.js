
// this function will be injected into each tab when the user 
function injectedFunction(data) {
  // grab the basic info from the page
  const title = document.title;
  const url = window.location.href;
  let description = "";
  const metaTags = document.querySelectorAll("meta");
  for (const element of metaTags) {
    if (element.name === "description") {
      description = element.content;
      break;
    }
  }

  // basic format of a tana-paste entry
  data += `  - ${title} #website\n    - Description:: ${description}\n    - Url:: ${url}\n`;
  
  // and put the result on the clipboard. We have to do this here because
  // the background.js webworker cannot
  
  navigator.clipboard.writeText(data).then(
    function () {
      console.log("Successfully copied data to clipboard");
    },
    function (err) {
      console.error("Error copying data to clipboard: ", err);
    }
  );
  return data;
}


chrome.action.onClicked.addListener(async (tab) => {
  console.log("got click");

  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs) {
    let data = `%%tana%%\n- Tab Workspace #workspace\n`;

    for (const tab of tabs) {
      console.log(tab.id)
      if (!tab.url.includes("chrome://")) {
        const results = await chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: injectedFunction,
            args: [data]
          });
        // we have to accumulate results since the clipboard write
        // i actually in the injected tab function
        data = results[0].result;
      }
    }
  }
});


chrome.runtime.onInstalled.addListener(() => {
  console.log("Installed tabs2tana");
  // mark our extension to say we're alive
  // chrome.action.setBadgeText({
  //   text: "WOKE",
  // });
});

