# Focus Tracker - A Browser Extension

Chrome extension designed to help you visualize your browsing habits and stay productive.


--------------------------------------------------------------------------------------------

🚀 Features

Automatic Time Tracking: Silently monitors the time spent on active browser tabs.

- Extension badge showing time spent on the current website

<img width="33" height="34" alt="image" src="https://github.com/user-attachments/assets/e4d794d9-f5c5-4f7a-bcfb-0b41ee2d99a3" /> 

- Today's browsing history displayed as a sleek list

<img width="344" height="159" alt="image" src="https://github.com/user-attachments/assets/30bd35b2-c03e-49eb-ae01-d3259d539f54" />


- Productivity Classification: Customise which websites are "Productive" or "Unproductive"
<img width="378" height="588" alt="image" src="https://github.com/user-attachments/assets/8e8b8ee2-7afe-45ac-96f9-57368ad36e9e" />
<img width="373" height="589" alt="image" src="https://github.com/user-attachments/assets/91bb7eb1-8977-4eec-a71a-cde7a2be8e28" />
<img width="345" height="183" alt="image" src="https://github.com/user-attachments/assets/5c8f98ee-82bc-4fea-8159-4f218504aa58" />




### Dynamic Visuals
---------------

- Interactive Charts: Toggle between Pie, Doughnut, and Bar charts to see your usage distribution
<img width="372" height="370" alt="image" src="https://github.com/user-attachments/assets/cac8280c-16c4-404f-9736-72073f7c035e" />
<img width="370" height="371" alt="image" src="https://github.com/user-attachments/assets/59818960-fe61-4383-9f50-d12b876f381b" /> <img width="379" height="207" alt="image" src="https://github.com/user-attachments/assets/22fa9d39-4fbc-4e97-aadb-87d92de5859f" />


- The Owl Companion: A virtual pet that changes appearance based on your productivity and serves to motivate you
<img width="226" height="200" alt="owl2" src="https://github.com/user-attachments/assets/744a5b00-5009-4ee1-bec8-f849fad4c946" />
<img width="226" height="200" alt="owl3" src="https://github.com/user-attachments/assets/6b5cefbc-888a-4d44-b27b-5c8060811da4" />
<img width="226" height="200" alt="owl4" src="https://github.com/user-attachments/assets/ab960ed3-5b3c-4f3e-ad32-28100b7f0bcd" />



- Calendar Feature: View your past performance with a color-coded calendar grid
  
<img width="377" height="360" alt="image" src="https://github.com/user-attachments/assets/e6139242-5f0b-4d55-9246-212938a4b2f7" />  <img width="379" height="466" alt="image" src="https://github.com/user-attachments/assets/d5dcdf52-806f-4073-ba0e-9e5876b688c7" />


## Tech Stack
- Frontend: HTML5, CSS3, JavaScript
- Data Visualization: [ Chart.js](https://www.chartjs.org/)
- Extension API: Manifest V3, Service Workers, Alarms, and Storage API




## Permissions Used
-storage: To save your history and site preferences.

-tabs & activeTab: To identify which domain you are currently visiting.

-alarms: To trigger the tracking logic consistently in the background.

-notifications: For future implementation of focus alerts.


## Installation
Download or clone this repository.
https://github.com/exeloq/Focus---Productivity-Tracker

Unzip into a new folder

Open Chrome and navigate to chrome://extensions/

Enable "Developer mode" in the top right corner.
<img width="1919" height="104" alt="image" src="https://github.com/user-attachments/assets/ebfb872e-822f-45ce-a823-4b0cd8a47b0e" />

Click "Load unpacked" and select the ExtensionProject folder.

--------------------------------------------------------------------------------------------

Data is secure and privately stored: All data is stored locally on your machine via chrome.storage.local. No data leaves your browser's local storage.



