

function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);

}

function autoSetTheme() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const isDayTime = (hour > 6 || (hour === 6 && minute >= 30)) && hour < 18;

  if (isDayTime) {
    setTheme('light');
    console.log("已设置为浅色主题 (时间)");
  } else {
    setTheme('dark');
    console.log("已设置为深色主题 (时间)");
  }
}

