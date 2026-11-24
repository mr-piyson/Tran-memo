package app.tauri.contacts

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.provider.ContactsContract
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@TauriPlugin(
  permissions = [
    Permission(strings = [Manifest.permission.READ_CONTACTS], alias = "contacts")
  ]
)
class ContactsPlugin(private val activity: Activity) : Plugin(activity) {

  @Command
  fun loadNativeContacts(invoke: Invoke) {
    requestPermissionForAlias("contacts", invoke, "loadContactsWithPermission")
  }

  @PermissionCallback
  fun loadContactsWithPermission(invoke: Invoke) {
    if (
      ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_CONTACTS) !=
        PackageManager.PERMISSION_GRANTED
    ) {
      invoke.reject("Contacts permission was denied")
      return
    }

    val projection =
      arrayOf(
        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
        ContactsContract.CommonDataKinds.Phone.NUMBER,
      )
    val selection = "${ContactsContract.CommonDataKinds.Phone.HAS_PHONE_NUMBER} = 1"
    val result = JSArray()

    val cursor =
      activity.contentResolver.query(
        ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
        projection,
        selection,
        null,
        "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} ASC",
      )

    cursor?.use { rows ->
      val nameIndex = rows.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
      val phoneIndex = rows.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
      while (rows.moveToNext()) {
        val name = if (nameIndex >= 0) rows.getString(nameIndex).orEmpty() else ""
        val phone = if (phoneIndex >= 0) rows.getString(phoneIndex).orEmpty() else ""
        if (name.isBlank() || phone.isBlank()) continue

        val item = JSObject()
        item.put("name", name.trim())
        item.put("phone", phone.trim())
        item.put("email", "")
        result.put(item)
      }
    }

    invoke.resolveObject(result)
  }
}
