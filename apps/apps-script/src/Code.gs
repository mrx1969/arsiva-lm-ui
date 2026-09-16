function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  template.appName = APP.NAME;
  template.appVersion = APP.VERSION;

  return template.evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDashboardBootstrap() {
  return executeSafely_(function () {
    return buildDashboardBootstrap_();
  });
}

function getArchivesPage(options) {
  return executeSafely_(function () {
    return listArchivesPage_(options || {});
  });
}

function searchArchives(options) {
  return executeSafely_(function () {
    const normalized = Object.assign({}, options || {});
    normalized.page = normalized.page || 1;
    return listArchivesPage_(normalized);
  });
}

function markNotificationRead(notificationId) {
  return executeSafely_(function () {
    return markNotificationRead_(notificationId);
  });
}
