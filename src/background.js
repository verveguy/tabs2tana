/* 
  background.js is the web worker code, which is basically "faceless" from a
  browser tab perspective.

  Note that we use the function injection style here to run code within
  each browser tab. This might be undesirable with respect to permissions:
  we seem to get prompted on each site we try to capture...
*/

// this function will be injected into each tab when the user activates this extension
// by clicking on the extension icon in their address bar 
// or by using the keyboard equivalent

function gatherTabData() {
  // grab the basic info from the page
  const title = document.title;
  const url = window.location.href;
  let description = "";

  // basic format of a tana-paste entry
  let data = `%%tana%%\n- ${title} #website`;

  let fields = [];
  fields.push(`\n  - Url:: ${url}`);

  const metaTags = document.querySelectorAll("meta");

  for (const element of metaTags) {
    if (element.name === "description") {
      description = element.content;
      fields.push("\n  - Description:: " + description);
    } else {
      let property = element.getAttribute("property");
      let content = element.content;
      if (property === "og:description") {
        // no point in duplicating the description
        if (content != description) {
          fields.push("\n  - og:Description:: " + content);
        }
      }
      if (property === "og:title") {
        // no point in duplicating the title
        if (content !== title) {
          fields.push("\n  - og:Title:: " + content);
        }
      }
      if (property === "og:url") {
        // no point in duplicating the url
        if (content != url) {
          fields.push("\n  - og:Url:: " + content);
        }
      }
      if (property === "og:type") {
        fields.push("\n  - og:Type:: " + content);
      }
      if (property === "og:image") {
        fields.push("\n  - og:Image:: " + content);
      }

      if (property === "og:site_name") {
        fields.push("\n  - og:Site:: " + content);
      }
    }
  }

  fields.forEach((field) => {
    data += field;
  });

  return data;
}

function writeClipboard(data) {
  // and put the result on the clipboard. We have to do this here because
  // the background.js webworker cannot

  // this seems to help avoid "DOMException: not focused" errors from time to time
  // ref: Stackoverflow 
  window.focus();
  navigator.clipboard.writeText(data).then(
    function () {
      console.log("Successfully copied data to clipboard");
    },
    function (err) {
      console.error("Error copying data to clipboard: ", err);
    }
  );
}


// wire up our listener for invocation of our extension

chrome.action.onClicked.addListener(async (tab) => {
  console.log("got click");

  const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
  if (tabs) {
    let data = `%%tana%%\n- Tab Workspace #workspace\n`;

    // gather all tab data serially, ensuring no race condition
    for (const tab of tabs) {
      console.log(tab.id)
      if (!tab.url.includes("chrome://")) {
        const results = await chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: gatherTabData,
          });
        // accumulate results since the clipboard write
        data += results[0].result;
      }
    }

    await chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: writeClipboard,
        args: [data]
      });
  }
});

// useless debug message. Doesn't appear anywhere I can see...
chrome.runtime.onInstalled.addListener(() => {
  console.log("Installed tabs2tana");
  // mark our extension to say we're alive
  // chrome.action.setBadgeText({
  //   text: "WOKE",
  // });
});

