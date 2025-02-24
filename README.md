# 📱 Instagram Unfollowers

[![Maintenance](https://img.shields.io/maintenance/yes/2025)](https://github.com/davidarroyo1234/InstagramUnfollowers)

Instagram Unfollowers is a handy browser-based tool that helps you identify who doesn't follow you back on Instagram – no downloads or installations required!

## ⚠️ WARNING

This version leverages the Instagram API for enhanced performance.  
**Use responsibly and at your own risk.**

## 🖥️ Desktop Usage

1. **Copy the Code:**  
   Visit [InstagramUnfollowers Tool](https://davidarroyo1234.github.io/InstagramUnfollowers/) and click the **COPY** button to copy the code snippet.
   
   ![Copy code button](./assets/copy_code.png)

2. **Log in to Instagram:**  
   Open Instagram in your browser and sign in to your account.

3. **Open Developer Console:**  
   - **Windows:** Press `Ctrl + Shift + J`
   - **Mac OS:** Press `⌘ + ⌥ + I`

4. **Paste and Execute:**  
   Paste the copied code into the console to reveal the interface.
   
   ![Initial screen](./assets/initial.png)

5. **Run the Script:**  
   Click the **RUN** button to start scanning.

6. **View Results:**  
   Once scanning is complete, the results will appear.
   
   ![Results screen](./assets/results.png)

7. **Whitelist Users:**  
   Click on a user's profile image to whitelist them (so they won’t be unfollowed).

8. **Select Users to Unfollow:**  
   Use the checkboxes to select which users to unfollow.

9. **Customize Settings:**  
   Adjust script timing and other options by clicking the **Settings** button.
   
   ![Settings screen](./assets/settings.png)

## 📱 Mobile Usage

For Android users:

1. Download the latest version of the [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/).
2. Open Instagram via the Eruda browser.
3. Follow the same steps as on desktop (the developer console is automatically available via the Eruda icon).

## ⚡ Performance Notes

- Processing time increases with the number of users to scan.
- Compatible with both Chromium and Firefox-based browsers.
- Mobile devices may experience slightly longer load times.

## 🛠️ Development

- **Node Version:** 16.14.0 (use `nvm use` if applicable).
- After modifying `main.tsx`, run the build command to format, compress, and transpile your code.
- Use `nodemon build-dev` for automatic rebuilding during development.

## ⚖️ Legal & License

**Disclaimer:**  
This tool is not affiliated with, endorsed by, or officially connected to Instagram.  
Use at your own risk!

This project is licensed under the [MIT License](LICENSE).  
- Free to use, copy, and modify.
- Open source and community-friendly.
- See the [LICENSE](LICENSE) file for full terms.
