package com.harleytg.critterextraction;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.OutputStream;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String APP_VERSION = "0.1.0-test1";
    private static final String PACKAGE_ID = "com.harleytg.critterextraction";
    private static final String LOCAL_ROOT = "file:///android_asset/game/";
    private static final String LOCAL_HOME = LOCAL_ROOT + "index.html";
    private static final String PUBLIC_ROOT = "https://markhitchk.github.io/critter-extraction/live/";
    private static final int FILE_CHOOSER_REQUEST = 7101;

    private FrameLayout root;
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private ValueCallback<Uri[]> pendingFileChooser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        configureWindow();

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(11, 12, 25));
        setContentView(root);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(11, 12, 25));
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        configureWebView();

        String initialUrl = mapIncomingUri(getIntent() != null ? getIntent().getData() : null);
        webView.loadUrl(initialUrl != null ? initialUrl : LOCAL_HOME);
    }

    private void configureWindow() {
        getWindow().setStatusBarColor(Color.rgb(11, 12, 25));
        getWindow().setNavigationBarColor(Color.rgb(11, 12, 25));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowManager.LayoutParams attrs = getWindow().getAttributes();
        attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        getWindow().setAttributes(attrs);
        applyImmersiveMode();
    }

    @SuppressWarnings("deprecation")
    private void applyImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString()
                + " CritterExtractionAndroid/" + APP_VERSION);

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.addJavascriptInterface(new AndroidBridge(), "CritterAndroid");
        webView.setWebViewClient(new GameWebViewClient());
        webView.setWebChromeClient(new GameChromeClient());
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
                return;
            }
            try {
                String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimeType);
                request.addRequestHeader("User-Agent", userAgent);
                String cookies = CookieManager.getInstance().getCookie(url);
                if (cookies != null) {
                    request.addRequestHeader("Cookie", cookies);
                }
                request.setTitle(fileName);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                manager.enqueue(request);
                Toast.makeText(this, "Downloading " + fileName, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "Download could not start", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private final class GameWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String raw = uri.toString();

            if (raw.startsWith(LOCAL_ROOT)
                    || raw.startsWith("about:")
                    || raw.startsWith("data:")
                    || raw.startsWith("blob:")) {
                return false;
            }

            String mapped = mapIncomingUri(uri);
            if (mapped != null) {
                view.loadUrl(mapped);
                return true;
            }

            String scheme = uri.getScheme();
            if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    Toast.makeText(MainActivity.this, "No app can open this link", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
            return false;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            injectAndroidBridgeHooks(view);
        }
    }

    private final class GameChromeClient extends WebChromeClient {
        @Override
        public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
            return super.onConsoleMessage(consoleMessage);
        }

        @Override
        public boolean onShowFileChooser(
                WebView webView,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams) {
            if (pendingFileChooser != null) {
                pendingFileChooser.onReceiveValue(null);
            }
            pendingFileChooser = filePathCallback;
            try {
                Intent intent = fileChooserParams.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                return true;
            } catch (Exception e) {
                pendingFileChooser = null;
                Toast.makeText(MainActivity.this, "File picker unavailable", Toast.LENGTH_SHORT).show();
                return false;
            }
        }

        @Override
        public void onShowCustomView(View view, CustomViewCallback callback) {
            if (customView != null) {
                callback.onCustomViewHidden();
                return;
            }
            customView = view;
            customViewCallback = callback;
            webView.setVisibility(View.GONE);
            root.addView(view, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT));
            applyImmersiveMode();
        }

        @Override
        public void onHideCustomView() {
            if (customView == null) {
                return;
            }
            root.removeView(customView);
            customView = null;
            webView.setVisibility(View.VISIBLE);
            if (customViewCallback != null) {
                customViewCallback.onCustomViewHidden();
                customViewCallback = null;
            }
            applyImmersiveMode();
        }
    }

    private void injectAndroidBridgeHooks(WebView view) {
        String script = "javascript:(function(){"
                + "if(window.__CRITTER_ANDROID_HOOKS__)return;"
                + "window.__CRITTER_ANDROID_HOOKS__=true;"
                + "window.__CRITTER_ANDROID__={version:'" + APP_VERSION + "',packageId:'" + PACKAGE_ID + "',publicBase:'" + PUBLIC_ROOT + "'};"
                + "document.addEventListener('click',async function(ev){"
                + "var a=ev.target&&ev.target.closest?ev.target.closest('a[download]'):null;"
                + "if(!a||!a.href||a.href.indexOf('blob:')!==0)return;"
                + "ev.preventDefault();"
                + "try{var r=await fetch(a.href);var b=await r.blob();var rd=new FileReader();"
                + "rd.onloadend=function(){var s=String(rd.result||'');var i=s.indexOf(',');"
                + "CritterAndroid.saveBase64File(a.download||'critter-extraction-export',b.type||'application/octet-stream',i>=0?s.substring(i+1):s);};"
                + "rd.readAsDataURL(b);}catch(e){console.error('Android export bridge failed',e);}},true);"
                + "})();";
        view.evaluateJavascript(script, null);
    }

    private String mapIncomingUri(Uri uri) {
        if (uri == null) {
            return null;
        }

        String scheme = uri.getScheme();
        String host = uri.getHost();

        if ("https".equalsIgnoreCase(scheme)
                && "markhitchk.github.io".equalsIgnoreCase(host)) {
            String path = uri.getPath() == null ? "" : uri.getPath();
            String prefix = "/critter-extraction/live/";
            if (!path.startsWith(prefix)) {
                return null;
            }
            String relative = path.substring(prefix.length());
            if (relative.isEmpty()) {
                relative = "index.html";
            } else if (relative.endsWith("/")) {
                relative += "index.html";
            }
            if (relative.contains("..")) {
                return null;
            }
            return appendQueryAndFragment(LOCAL_ROOT + relative, uri);
        }

        if ("critterextraction".equalsIgnoreCase(scheme)) {
            String destination = host == null ? "" : host.toLowerCase(Locale.ROOT);
            String local = "invite".equals(destination)
                    ? LOCAL_ROOT + "invite/index.html"
                    : LOCAL_HOME;
            return appendQueryAndFragment(local, uri);
        }

        return null;
    }

    private static String appendQueryAndFragment(String base, Uri source) {
        StringBuilder out = new StringBuilder(base);
        if (source.getEncodedQuery() != null && !source.getEncodedQuery().isEmpty()) {
            out.append('?').append(source.getEncodedQuery());
        }
        if (source.getEncodedFragment() != null && !source.getEncodedFragment().isEmpty()) {
            out.append('#').append(source.getEncodedFragment());
        }
        return out.toString();
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public String getAppVersion() {
            return APP_VERSION;
        }

        @JavascriptInterface
        public String getPackageId() {
            return PACKAGE_ID;
        }

        @JavascriptInterface
        public void saveBase64File(String requestedName, String mimeType, String encodedData) {
            if (encodedData == null || encodedData.isEmpty()) {
                return;
            }
            String fileName = sanitizeFileName(requestedName);
            String safeMime = mimeType == null || mimeType.isEmpty()
                    ? "application/octet-stream"
                    : mimeType;
            try {
                byte[] bytes = Base64.decode(encodedData, Base64.DEFAULT);
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, safeMime);
                values.put(MediaStore.Downloads.RELATIVE_PATH,
                        Environment.DIRECTORY_DOWNLOADS + "/Critter Extraction");

                Uri outputUri = getContentResolver().insert(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (outputUri == null) {
                    throw new IllegalStateException("Unable to create download");
                }
                try (OutputStream out = getContentResolver().openOutputStream(outputUri)) {
                    if (out == null) {
                        throw new IllegalStateException("Unable to open download");
                    }
                    out.write(bytes);
                }
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Saved to Downloads/Critter Extraction/" + fileName,
                        Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Export could not be saved",
                        Toast.LENGTH_LONG).show());
            }
        }
    }

    private static String sanitizeFileName(String input) {
        String value = input == null || input.trim().isEmpty()
                ? "critter-extraction-export"
                : input.trim();
        value = value.replaceAll("[\\\\/:*?\"<>|]", "_");
        if (value.length() > 120) {
            value = value.substring(0, 120);
        }
        return value;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || pendingFileChooser == null) {
            return;
        }
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        }
        pendingFileChooser.onReceiveValue(result);
        pendingFileChooser = null;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (webView == null) {
            return;
        }
        String mapped = mapIncomingUri(intent.getData());
        if (mapped != null) {
            webView.loadUrl(mapped);
        }
    }

    @Override
    public void onBackPressed() {
        if (customView != null && webView.getWebChromeClient() instanceof GameChromeClient) {
            ((GameChromeClient) webView.getWebChromeClient()).onHideCustomView();
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
        applyImmersiveMode();
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
